import http, { RefinedResponse, ResponseType } from "k6/http";
import encoding from "k6/encoding";

import { AWSClient } from "./client.ts";
import { AWSConfig } from "./config.ts";
import { AWSError } from "./error.ts";
import { InvalidSignatureError, SignatureV4 } from "./signature.ts";
import { AMZ_TARGET_HEADER } from "./constants.ts";
import { HTTPHeaders, HTTPMethod, QueryParameterBag } from "./http.ts";

/**
 * Class allowing to interact with Amazon AWS's Lambda service
 */
export class LambdaClient extends AWSClient {
  private readonly signature: SignatureV4;
  private readonly commonHeaders: HTTPHeaders;
  private readonly method: HTTPMethod;

  constructor(awsConfig: AWSConfig) {
    super(awsConfig, "lambda");

    this.signature = new SignatureV4({
      service: this.serviceName,
      region: this.awsConfig.region,
      credentials: {
        accessKeyId: this.awsConfig.accessKeyId,
        secretAccessKey: this.awsConfig.secretAccessKey,
        sessionToken: this.awsConfig.sessionToken,
      },
      uriEscapePath: true,
      applyChecksum: false,
    });

    this.method = "POST";
    this.commonHeaders = {
      "Content-Type": "application/x-amz-json-1.1",
    };
  }

  /**
   * Invoke an AWS Lambda function
   *
   * @param {string} name - The name of the function
   * @param {string} payload - The payload to send to function
   * @param {InvocationOptions} options - Additional options to customize invocation
   *
   * @throws {LambdaInvocationError}
   */
  async invoke(
    name: string,
    payload: string,
    options: InvocationOptions = {},
  ): Promise<InvocationResponse> {
    const query: QueryParameterBag = {};
    const invocationType = options.invocationType || "RequestResponse";
    const headers = {
      ...this.commonHeaders,
      [AMZ_TARGET_HEADER]: `AWSLambda.${invocationType}`,
      "X-Amz-Invocation-Type": invocationType,
      "X-Amz-Log-Type": options.logType || "None",
    };
    if (options.clientContext) {
      headers["X-Amz-Client-Context"] = options.clientContext;
    }
    if (options.qualifier) {
      query["Qualifier"] = options.qualifier;
    }

    const signedRequest = this.signature.sign(
      {
        method: this.method,
        endpoint: this.endpoint,
        path: `/2015-03-31/functions/${name}/invocations`,
        query,
        headers,
        body: payload || "",
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
    this.handleError(res);

    const logResult = res.headers["X-Amz-Log-Result"];
    const response = {
      executedVersion: res.headers["X-Amz-Executed-Version"],
      logResult: logResult
        ? encoding.b64decode(logResult, "std", "s")
        : undefined,
      statusCode: res.status,
      payload: res.body as string,
    };

    const functionError = res.headers["X-Amz-Function-Error"];
    if (functionError) {
      throw new LambdaInvocationError(functionError, response);
    } else {
      return response;
    }
  }

  protected override handleError(
    response: RefinedResponse<ResponseType | undefined>,
    operation?: string,
  ): boolean {
    const errored = super.handleError(response, operation);
    if (!errored) {
      return false;
    }

    const awsError = AWSError.parse(response);
    switch (awsError.code) {
      case "AuthorizationHeaderMalformed":
      case "InvalidSignatureException":
        throw new InvalidSignatureError(awsError.message, awsError.code);
      default:
        throw awsError;
    }
  }
}

export class LambdaInvocationError extends Error {
  response: InvocationResponse;

  constructor(message: string, response: InvocationResponse) {
    super(`${message}: ${response.payload}`);
    this.response = response;
  }
}

interface InvocationOptions {
  /**
   * Defines whether the function is invoked synchronously or asynchronously.
   * - `RequestResponse` (default): Invoke the function synchronously.
   * - `Event`: Invoke the function asynchronously.
   * - `DryRun`: Validate parameter values and verify that the user or role has permission to invoke the function.
   */
  invocationType?: "RequestResponse" | "Event" | "DryRun";
  /**
   * Set to `Tail` to include the execution log in the response. Applies to synchronously invoked functions only.
   */
  logType?: "None" | "Tail";
  /**
   * Up to 3,583 bytes of base64-encoded data about the invoking client to pass to the function in the context object.
   */
  clientContext?: string;
  /**
   * Specify a version or alias to invoke a published version of the function.
   */
  qualifier?: string;
}

interface InvocationResponse {
  statusCode: number;
  executedVersion?: string;
  logResult?: string;
  payload?: string;
}
