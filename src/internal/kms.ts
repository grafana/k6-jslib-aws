import { JSONArray, JSONObject } from "k6";
import http, { RefinedResponse, ResponseType } from "k6/http";

import { AWSClient } from "./client.ts";
import { AWSConfig } from "./config.ts";
import { AMZ_TARGET_HEADER } from "./constants.ts";
import { AWSError } from "./error.ts";
import { HTTPHeaders, HTTPMethod } from "./http.ts";
import { InvalidSignatureError, SignatureV4 } from "./signature.ts";

/**
 * Class allowing to interact with Amazon AWS's KMS service
 */
export class KMSClient extends AWSClient {
  private readonly signature: SignatureV4;
  private readonly method: HTTPMethod;
  private readonly commonHeaders: HTTPHeaders;

  /**
   * Create a KMSClient
   * @param  {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
   */
  constructor(awsConfig: AWSConfig) {
    super(awsConfig, "kms");

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

    // All interactions with the KMS service
    // are made via the GET or POST method.
    this.method = "POST";

    this.commonHeaders = {
      "Content-Type": "application/x-amz-json-1.1",
    };
  }

  /**
   * Gets a list of all the KMS keys in the caller's AWS
   * account and region.
   *
   * @returns an array of all the available keys
   */
  async listKeys(): Promise<Array<KMSKey>> {
    const signedRequest = this.signature.sign(
      {
        method: this.method,
        endpoint: this.endpoint,
        path: "/",
        headers: {
          ...this.commonHeaders,
          // For some reason, the base target is not kms...
          [AMZ_TARGET_HEADER]: `TrentService.ListKeys`,
        },
        body: JSON.stringify({}),
      },
      {},
    );

    const res = await http.asyncRequest(
      this.method,
      signedRequest.url,
      signedRequest.body,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, KMSOperation.ListKeys);

    const json: JSONArray = res.json("Keys") as JSONArray;
    return json.map((k) => KMSKey.fromJSON(k as JSONObject));
  }

  /**
   * GenerateDataKey returns a unique symmetric data key for use outside of AWS KMS.
   *
   * This operation returns a plaintext copy of the data key and a copy that is encrypted under a symmetric encryption KMS key that you specify.
   * The bytes in the plaintext key are random; they are not related to the caller or the KMS key.
   * You can use the plaintext key to encrypt your data outside of AWS KMS and store the encrypted data key with the encrypted data.
   *
   * To generate a data key, specify the symmetric encryption KMS key that will be used to encrypt the data key.
   * You cannot use an asymmetric KMS key to encrypt data keys.
   *
   * Used to generate data key with the KMS key defined
   * @param {string} id - Specifies the symmetric encryption KMS key that encrypts the data key. Use its key ID, key ARN, alias name, or alias ARN.
   * @param {KMKeySize} size - Specifies the length of the data key in bytes. For example, use the value 64 to generate a 512-bit data key (64 bytes is 512 bits). Default is 32, and generates a 256-bit data key.
   * @throws {KMSServiceError}
   * @throws {InvalidSignatureError}
   * @returns {KMSDataKey} - The generated data key.
   */
  async generateDataKey(
    id: string,
    size: KMSKeySize = KMSKeySize.Size256,
  ): Promise<KMSDataKey | undefined> {
    const signedRequest = this.signature.sign(
      {
        method: this.method,
        endpoint: this.endpoint,
        path: "/",
        headers: {
          ...this.commonHeaders,
          // For some reason, the base target is not kms...
          [AMZ_TARGET_HEADER]: `TrentService.GenerateDataKey`,
        },
        body: JSON.stringify({ KeyId: id, NumberOfBytes: size }),
      },
      {},
    );

    const res = await http.asyncRequest(
      this.method,
      signedRequest.url,
      signedRequest.body,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, KMSOperation.GenerateDataKey);

    return KMSDataKey.fromJSON(res.json() as JSONObject);
  }

  protected override handleError(
    response: RefinedResponse<ResponseType | undefined>,
    operation?: string,
  ): boolean {
    const errored = super.handleError(response, operation);
    if (!errored) {
      return false;
    }

    const errorCode = response.error_code;
    const error = response.json() as JSONObject;
    if (errorCode >= 1400 && errorCode <= 1499) {
      // In the event of certain errors, the message is not set.
      // Also, note the inconsistency in casing...
      const errorMessage: string = (error.Message as string) ||
        (error.message as string) || (error.__type as string);

      // Handle specifically the case of an invalid signature
      if (error.__type === "InvalidSignatureException") {
        throw new InvalidSignatureError(errorMessage, error.__type);
      }

      // Otherwise throw a standard service error
      throw new KMSServiceError(
        errorMessage,
        error.__type as string,
        operation as KMSOperation,
      );
    }

    if (errorCode === 1500) {
      throw new KMSServiceError(
        "An error occured on the server side",
        "InternalServiceError",
        operation as KMSOperation,
      );
    }

    return true;
  }
}

/**
 * Class representing a KMS key
 */
export class KMSKey {
  /**
   * ARN of the key
   */
  keyArn: string;

  /**
   * Unique identifier of the key
   */
  keyId: string;

  constructor(keyArn: string, KeyId: string) {
    this.keyArn = keyArn;
    this.keyId = KeyId;
  }

  static fromJSON(json: JSONObject) {
    return new KMSKey(json.KeyArn as string, json.KeyId as string);
  }
}

/**
 * Class representing a data key
 */
export class KMSDataKey {
  /**
   * The Amazon Resource Name (key ARN) of the KMS key that encrypted the data key.
   */
  id: string;

  /**
   * The (base64-encoded) encrypted copy of the data key.
   */
  ciphertextBlob: string;

  /**
   * The plaintext data key.
   * Use this data key to encrypt your data outside of KMS. Then, remove it from memory as soon as possible.
   */
  plaintext: string;

  constructor(CiphertextBlob: string, KeyId: string, Plaintext: string) {
    this.ciphertextBlob = CiphertextBlob;
    this.id = KeyId;
    this.plaintext = Plaintext;
  }

  static fromJSON(json: JSONObject) {
    return new KMSDataKey(
      json.CiphertextBlob as string,
      json.KeyId as string,
      json.Plaintext as string,
    );
  }
}

export class KMSServiceError extends AWSError {
  operation: KMSOperation;

  /**
   * Constructs a KMSServiceError
   *
   * @param  {string} message - human readable error message
   * @param  {string} code - A unique short code representing the error that was emitted
   * @param  {string} operation - Name of the failed Operation
   */
  constructor(message: string, code: string, operation: KMSOperation) {
    super(message, code);
    this.name = "KMSServiceError";
    this.operation = operation;
  }
}

/**
 *  KMSOperation defines all currently implemented KMS Service operations.
 */
enum KMSOperation {
  GenerateDataKey = "GenerateDataKey",
  ListKeys = "ListKeys",
}

/**
 *  KMSKeyLength describes possible key lenght values for KMS API data key operations.
 */
enum KMSKeySize {
  Size256 = 32,
  Size512 = 64,
}
