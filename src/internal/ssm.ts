import { JSONObject } from "k6";
import http, { RefinedResponse, ResponseType } from "k6/http";

import { AWSClient } from "./client.ts";
import { AWSConfig } from "./config.ts";
import { AMZ_TARGET_HEADER } from "./constants.ts";
import { AWSError } from "./error.ts";
import { HTTPHeaders, HTTPMethod } from "./http.ts";
import { InvalidSignatureError, SignatureV4 } from "./signature.ts";

/**
 * Class allowing to interact with Amazon AWS's Systems Manager service
 */
export class SystemsManagerClient extends AWSClient {
  private readonly signature: SignatureV4;
  private readonly method: HTTPMethod;
  private readonly commonHeaders: HTTPHeaders;

  /**
   * Create a SystemsManagerClient
   * @param  {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
   */
  constructor(awsConfig: AWSConfig) {
    super(awsConfig, "ssm");

    // All interactions with the Systems Manager service
    // are made via the POST method.
    this.method = "POST";
    this.commonHeaders = {
      "Content-Type": "application/x-amz-json-1.1",
    };

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

  /**
   * Retrieves a parameter from Amazon Systems Manager
   *
   * @param {string} name - The ARN or name of the parameter to retrieve.
   * @param {boolean} withDecryption - whether returned secure string parameters should be decrypted.
   * @returns {SystemsManagerParameter} - returns the fetched Parameter object.
   * @throws {SystemsManagerServiceError}
   * @throws {InvalidSignatureError}
   */
  async getParameter(
    name: string,
    withDecryption: boolean = false,
  ): Promise<SystemsManagerParameter | undefined> {
    const signedRequest = this.signature.sign(
      {
        method: this.method,
        endpoint: this.endpoint,
        path: "/",
        headers: {
          ...this.commonHeaders,
          [AMZ_TARGET_HEADER]: `AmazonSSM.GetParameter`,
        },
        body: JSON.stringify({ Name: name, WithDecryption: withDecryption }),
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
    this.handleError(res, SystemsManagerOperation.GetParameter);

    return SystemsManagerParameter.fromJSON(res.json() as JSONObject);
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
      throw new SystemsManagerServiceError(
        errorMessage,
        error.__type as string,
        operation as SystemsManagerOperation,
      );
    }

    if (errorCode === 1500) {
      throw new SystemsManagerServiceError(
        "An error occured on the server side",
        "InternalServiceError",
        operation as SystemsManagerOperation,
      );
    }

    return true;
  }
}

/**
 * Class representing a Systems Manager's Parameter
 */
export class SystemsManagerParameter {
  /**
   * The Amazon Resource Name (ARN) of the parameter.
   */
  arn: string;

  /**
   * The data type of the parameter, such as text or aws:ec2:image.
   * The default is text.
   */
  dataType: string;

  /**
   * Date the parameter was last changed or updated and the parameter version was created.
   */
  lastModifiedDate: number;

  /**
   * The friendly name of the parameter.
   */
  name: string;

  /**
   * Either the version number or the label used to retrieve the parameter value. Specify selectors by using one of the following formats:
   *  parameter_name:version
   *  parameter_name:label
   */
  selector: string;

  /**
   * plies to parameters that reference information in other AWS services. SourceResult is the raw result or response from the source.
   */
  sourceResult: string;

  /**
   * The type of parameter. Valid values include the following: String, StringList, and SecureString.
   */
  type: string;

  /**
   * The parameter value.
   */
  value: string;

  /**
   * The parameter version.
   */
  version: number;

  /**
   * Constructs a Systems Manager's Parameter
   *
   * @param  {string} arn - The Amazon Resource Name (ARN) of the parameter.
   * @param  {string} dataType - The data type of the parameter, such as text or aws:ec2:image. The default is text.
   * @param  {number} lastModifiedDate - Date the parameter was last changed or updated and the parameter version was created.
   * @param  {string} name - The friendly name of the parameter.
   * @param  {string} selector - Either the version number or the label used to retrieve the parameter value. Specify selectors by using one of the following formats:
   *  parameter_name:version
   *  parameter_name:label
   * @param  {string} sourceResult - Applies to parameters that reference information in other AWS services. SourceResult is the raw result or response from the source.
   * @param  {string} type - The type of parameter. Valid values include the following: String, StringList, and SecureString.
   * @param  {string} value - The parameter value.
   * @param  {number} version - The parameter version.
   */
  constructor(
    arn: string,
    dataType: string,
    lastModifiedDate: number,
    name: string,
    selector: string,
    sourceResult: string,
    type: string,
    value: string,
    version: number,
  ) {
    this.arn = arn;
    this.dataType = dataType;
    this.lastModifiedDate = lastModifiedDate;
    this.name = name;
    this.selector = selector;
    this.sourceResult = sourceResult;
    this.type = type;
    this.value = value;
    this.version = version;
  }

  /**
   * Parses and constructs a Systems Manager's Parameter from the content
   * of a JSON response returned by the AWS service
   *
   * @param  {Object} json - JSON object as returned and parsed from
   *     the AWS service's API call.
   * @returns {SystemsManagerParameter}
   */
  static fromJSON(json: JSONObject): SystemsManagerParameter {
    const parameter = json.Parameter as JSONObject;

    return new SystemsManagerParameter(
      parameter.ARN as string,
      parameter.DataType as string,
      parameter.LastModifiedDate as number,
      parameter.Name as string,
      parameter.Selector as string,
      parameter.SourceResult as string,
      parameter.Type as string,
      parameter.Value as string,
      parameter.Version as number,
    );
  }
}

export class SystemsManagerServiceError extends AWSError {
  operation: SystemsManagerOperation;

  /**
   * Constructs a SystemsManagerServiceError
   *
   * @param  {string} message - human readable error message
   * @param  {string} code - A unique short code representing the error that was emitted
   * @param  {SystemsManagerOperation} operation - Name of the failed Operation
   */
  constructor(
    message: string,
    code: string,
    operation: SystemsManagerOperation,
  ) {
    super(message, code);
    this.name = "SystemsManagerServiceError";
    this.operation = operation;
  }
}

/**
 *  SystemsManagerOperation defines all currently implemented Systems Manager operations.
 */
enum SystemsManagerOperation {
  GetParameter = "GetParameter",
}
