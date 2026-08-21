import encoding from "k6/encoding";
import http, { type RefinedResponse, type ResponseType } from "k6/http";

import { AWSClient } from "./client.ts";
import { AWSConfig } from "./config.ts";
import { AMZ_TARGET_HEADER } from "./constants.ts";
import { AWSError } from "./error.ts";
import { type JSONObject } from "./json.ts";
import { type HTTPHeaders, type HTTPMethod } from "./http.ts";
import { SignatureV4 } from "./signature.ts";

// The 3072-bit MODP group used by Cognito's SRP implementation (RFC 3526).
const SRP_N_HEX = "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1" +
  "29024E088A67CC74020BBEA63B139B22514A08798E3404DDE" +
  "F9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245" +
  "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED" +
  "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D" +
  "C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F" +
  "83655D23DCA3AD961C62F356208552BB9ED529077096966D" +
  "670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B" +
  "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9" +
  "DE2BCBF6955817183995497CEA956AE515D2261898FA0510" +
  "15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64" +
  "ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7" +
  "ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6B" +
  "F12FFA06D98A0864D87602733EC86A64521F2B18177B200C" +
  "BBE117577A615D6C770988C0BAD946E208E24FA074E5AB31" +
  "43DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF";

const SRP_N = BigInt(`0x${SRP_N_HEX}`);
const SRP_G = 2n;

/** Options for the Cognito USER_SRP_AUTH flow. */
export interface CognitoAuthOptions {
  /** App client secret, when the Cognito app client is configured with one. */
  clientSecret?: string;
  /** Metadata passed to Cognito triggers. */
  clientMetadata?: Record<string, string>;
  /** Code for an SMS_MFA challenge, if the user has MFA enabled. */
  mfaCode?: string;
}

/** Tokens returned by a successful Cognito authentication. */
export interface CognitoAuthenticationResult {
  AccessToken?: string;
  IdToken?: string;
  RefreshToken?: string;
  ExpiresIn?: number;
  TokenType?: string;
  NewDeviceMetadata?: JSONObject;
}

/** A Cognito user pool returned by {@link CognitoIdentityProviderClient.listUserPools}. */
export interface CognitoUserPool {
  Id: string;
  Name: string;
}

/** A Cognito app client returned by {@link CognitoIdentityProviderClient.listUserPoolClients}. */
export interface CognitoUserPoolClient {
  ClientId: string;
  ClientName: string;
}

/**
 * Client for Amazon Cognito Identity Provider.
 *
 * Currently this client implements Cognito's USER_SRP_AUTH flow, including
 * the PASSWORD_VERIFIER and SMS_MFA challenges.
 */
export class CognitoIdentityProviderClient extends AWSClient {
  private readonly signature: SignatureV4;
  private readonly method: HTTPMethod = "POST";
  private readonly commonHeaders: HTTPHeaders = {
    "Content-Type": "application/x-amz-json-1.1",
  };

  constructor(awsConfig: AWSConfig) {
    super(awsConfig, "cognito-idp");
    this.signature = new SignatureV4({
      service: this.serviceName,
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
        sessionToken: awsConfig.sessionToken,
      },
      uriEscapePath: true,
      applyChecksum: false,
    });
  }

  /** List user pools in the current account and region. */
  async listUserPools(): Promise<CognitoUserPool[]> {
    const response = await this.request("ListUserPools", { MaxResults: 60 });
    return (response.UserPools ?? []) as CognitoUserPool[];
  }

  /** List app clients associated with a user pool. */
  async listUserPoolClients(
    userPoolId: string,
  ): Promise<CognitoUserPoolClient[]> {
    const response = await this.request("ListUserPoolClients", {
      UserPoolId: userPoolId,
      MaxResults: 60,
    });
    return (response.UserPoolClients ?? []) as CognitoUserPoolClient[];
  }

  /** Authenticate a user with Cognito's Secure Remote Password protocol. */
  async authenticateUser(
    username: string,
    password: string,
    userPoolId: string,
    clientId: string,
    options: CognitoAuthOptions = {},
  ): Promise<CognitoAuthenticationResult> {
    const srp = await CognitoSRP.create(password, userPoolId);
    const authParameters: Record<string, string> = {
      USERNAME: username,
      SRP_A: srp.publicAHex,
    };
    if (options.clientSecret) {
      authParameters.SECRET_HASH = await secretHash(
        username,
        clientId,
        options.clientSecret,
      );
    }

    const initiate = await this.request("InitiateAuth", {
      AuthFlow: "USER_SRP_AUTH",
      ClientId: clientId,
      AuthParameters: authParameters,
      ClientMetadata: options.clientMetadata,
    });

    if (initiate.ChallengeName === "PASSWORD_VERIFIER") {
      return await this.respondToPasswordVerifier(
        initiate,
        srp,
        clientId,
        options,
      );
    }
    if (initiate.ChallengeName === "SMS_MFA") {
      return await this.respondToSmsMfa(initiate, username, clientId, options);
    }
    if (initiate.AuthenticationResult) {
      return initiate.AuthenticationResult as CognitoAuthenticationResult;
    }
    throw new CognitoServiceError(
      `unsupported Cognito authentication challenge: ${initiate.ChallengeName}`,
      "UnsupportedChallengeException",
      "InitiateAuth",
    );
  }

  private async respondToPasswordVerifier(
    challenge: JSONObject,
    srp: CognitoSRP,
    clientId: string,
    options: CognitoAuthOptions,
  ): Promise<CognitoAuthenticationResult> {
    const params = challenge.ChallengeParameters as JSONObject;
    const username = params.USER_ID_FOR_SRP as string;
    const responses = await srp.passwordVerifierResponses(params, username);
    if (options.clientSecret) {
      responses.SECRET_HASH = await secretHash(
        username,
        clientId,
        options.clientSecret,
      );
    }

    const result = await this.request("RespondToAuthChallenge", {
      ChallengeName: "PASSWORD_VERIFIER",
      ClientId: clientId,
      ChallengeResponses: responses,
      Session: challenge.Session,
    });
    if (result.ChallengeName === "SMS_MFA") {
      return await this.respondToSmsMfa(result, username, clientId, options);
    }
    return authenticationResult(result, "RespondToAuthChallenge");
  }

  private async respondToSmsMfa(
    challenge: JSONObject,
    username: string,
    clientId: string,
    options: CognitoAuthOptions,
  ): Promise<CognitoAuthenticationResult> {
    if (!options.mfaCode) {
      throw new CognitoServiceError(
        "MFA is required but no mfaCode was provided",
        "MFARequiredException",
        "RespondToAuthChallenge",
      );
    }
    const responses: Record<string, string> = {
      USERNAME: username,
      SMS_MFA_CODE: options.mfaCode,
    };
    if (options.clientSecret) {
      responses.SECRET_HASH = await secretHash(
        username,
        clientId,
        options.clientSecret,
      );
    }
    return authenticationResult(
      await this.request("RespondToAuthChallenge", {
        ChallengeName: "SMS_MFA",
        ClientId: clientId,
        ChallengeResponses: responses,
        Session: challenge.Session,
      }),
      "RespondToAuthChallenge",
    );
  }

  private async request(operation: CognitoOperation, body: JSONObject) {
    const signedRequest = this.signature.sign({
      method: this.method,
      endpoint: this.endpoint,
      path: "/",
      headers: {
        ...this.commonHeaders,
        [AMZ_TARGET_HEADER]: `AWSCognitoIdentityProviderService.${operation}`,
      },
      body: JSON.stringify(body),
    });
    const response = await http.asyncRequest(
      this.method,
      signedRequest.url,
      signedRequest.body,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(response, operation);
    return response.json() as JSONObject;
  }

  protected override handleError(
    response: RefinedResponse<ResponseType | undefined>,
    operation?: string,
  ): boolean {
    const errored = super.handleError(response, operation);
    if (!errored) return false;
    const error = response.json() as JSONObject;
    throw new CognitoServiceError(
      (error.message || error.Message || error.__type ||
        "Cognito request failed") as string,
      (error.__type || "CognitoException") as string,
      operation as CognitoOperation,
    );
  }
}

type CognitoOperation =
  | "InitiateAuth"
  | "ListUserPoolClients"
  | "ListUserPools"
  | "RespondToAuthChallenge";

/** Error returned by Amazon Cognito Identity Provider. */
export class CognitoServiceError extends AWSError {
  operation: CognitoOperation;

  constructor(message: string, code: string, operation: CognitoOperation) {
    super(message, code);
    this.name = "CognitoServiceError";
    this.operation = operation;
  }
}

class CognitoSRP {
  private readonly privateA: bigint;
  readonly publicAHex: string;

  private constructor(
    private readonly password: string,
    private readonly userPoolId: string,
    private readonly srpK: bigint,
    privateA: bigint,
  ) {
    this.privateA = privateA;
    // Cognito's reference client sends A as an unpadded hexadecimal integer.
    this.publicAHex = modPow(SRP_G, this.privateA, SRP_N).toString(16);
  }

  static async create(
    password: string,
    userPoolId: string,
    privateA?: bigint,
  ): Promise<CognitoSRP> {
    const randomBytes = new Uint8Array(128);
    crypto.getRandomValues(randomBytes);
    const a = privateA ?? BigInt(`0x${arrayBufferToHex(randomBytes.buffer)}`);
    const k = BigInt(`0x${await hexHash(`00${SRP_N_HEX}02`)}`);
    return new CognitoSRP(password, userPoolId, k, a);
  }

  async passwordVerifierResponses(
    parameters: JSONObject,
    canonicalUsername: string,
    date = new Date(),
  ): Promise<Record<string, string>> {
    const serverB = BigInt(`0x${parameters.SRP_B as string}`);
    const salt = BigInt(`0x${parameters.SALT as string}`);
    if (serverB % SRP_N === 0n) {
      throw new Error("invalid Cognito SRP server value");
    }
    const u = BigInt(
      `0x${await hexHash(
        padHex(BigInt(`0x${this.publicAHex}`)) + padHex(serverB),
      )}`,
    );
    if (u === 0n) throw new Error("invalid Cognito SRP server value");

    const poolName = this.userPoolId.split("_").slice(1).join("_");
    const userPasswordHash = await sha256Hex(
      new TextEncoder().encode(
        `${poolName}${canonicalUsername}:${this.password}`,
      ).buffer,
    );
    const x = BigInt(`0x${await hexHash(padHex(salt) + userPasswordHash)}`);
    const base = mod(serverB - this.srpK * modPow(SRP_G, x, SRP_N), SRP_N);
    const s = modPow(base, this.privateA + u * x, SRP_N);
    const hkdf = await deriveKey(padHex(s), padHex(u));
    const timestamp = cognitoTimestamp(date);
    const message = new Uint8Array([
      ...new TextEncoder().encode(poolName),
      ...new TextEncoder().encode(canonicalUsername),
      ...base64ToBytes(parameters.SECRET_BLOCK as string),
      ...new TextEncoder().encode(timestamp),
    ]);

    return {
      USERNAME: canonicalUsername,
      PASSWORD_CLAIM_SECRET_BLOCK: parameters.SECRET_BLOCK as string,
      TIMESTAMP: timestamp,
      PASSWORD_CLAIM_SIGNATURE: encoding.b64encode(
        await hmacSha256(hkdf.buffer, message.buffer),
      ),
    };
  }
}

/**
 * Exposes deterministic SRP calculations for the compatibility test suite.
 * This is not part of the supported Cognito client API.
 *
 * @internal
 */
export async function __testOnlyCognitoSrp(
  password: string,
  userPoolId: string,
  privateAHex: string,
  challenge: JSONObject,
  canonicalUsername: string,
  timestamp: Date,
) {
  const srp = await CognitoSRP.create(
    password,
    userPoolId,
    BigInt(`0x${privateAHex}`),
  );
  return {
    publicAHex: srp.publicAHex,
    challengeResponses: await srp.passwordVerifierResponses(
      challenge,
      canonicalUsername,
      timestamp,
    ),
  };
}

function authenticationResult(
  response: JSONObject,
  operation: CognitoOperation,
) {
  if (!response.AuthenticationResult) {
    throw new CognitoServiceError(
      "Cognito did not return authentication tokens",
      "NotAuthorizedException",
      operation,
    );
  }
  return response.AuthenticationResult as CognitoAuthenticationResult;
}

async function secretHash(
  username: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  return encoding.b64encode(
    await hmacSha256(
      new TextEncoder().encode(clientSecret).buffer,
      new TextEncoder().encode(`${username}${clientId}`).buffer,
    ),
  );
}

async function deriveKey(ikmHex: string, saltHex: string): Promise<Uint8Array> {
  const prk = await hmacSha256(
    hexToArrayBuffer(saltHex),
    hexToArrayBuffer(ikmHex),
  );
  const info = new TextEncoder().encode("Caldera Derived Key");
  const output = await hmacSha256(
    prk,
    new Uint8Array([...info, 1]).buffer,
  );
  return new Uint8Array(output).slice(0, 16);
}

async function hexHash(hex: string): Promise<string> {
  return await sha256Hex(hexToArrayBuffer(hex));
}

async function sha256Hex(value: ArrayBuffer): Promise<string> {
  return arrayBufferToHex(await crypto.subtle.digest("SHA-256", value));
}

async function hmacSha256(
  secret: ArrayBuffer,
  value: ArrayBuffer,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", key, value);
}

function padHex(value: bigint): string {
  let hex = value.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  if (hex[0] >= "8") hex = `00${hex}`;
  return hex;
}

function mod(value: bigint, modulus: bigint): bigint {
  const result = value % modulus;
  return result >= 0n ? result : result + modulus;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let factor = mod(base, modulus);
  let power = exponent;
  while (power > 0n) {
    if (power & 1n) result = (result * factor) % modulus;
    factor = (factor * factor) % modulus;
    power >>= 1n;
  }
  return result;
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(encoding.b64decode(value, "std"));
}

function cognitoTimestamp(date: Date): string {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const time = `${date.getUTCHours().toString().padStart(2, "0")}:${
    date
      .getUTCMinutes()
      .toString()
      .padStart(2, "0")
  }:${date.getUTCSeconds().toString().padStart(2, "0")}`;
  return `${weekdays[date.getUTCDay()]} ${
    months[date.getUTCMonth()]
  } ${date.getUTCDate()} ${time} UTC ${date.getUTCFullYear()}`;
}
