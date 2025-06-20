import { type Params, type RefinedResponse, type ResponseType } from "k6/http";

import { AWSConfig } from "./config.ts";
import { Endpoint } from "./endpoint.ts";
import { HTTPHeaders } from "./http.ts";
import {
  DNSError,
  DNSErrorKind,
  GeneralError,
  GeneralErrorKind,
  HTTP2Error,
  HTTP2ErrorKind,
  TCPError,
  TCPErrorKind,
  TLSError,
  TLSErrorKind,
} from "./error.ts";

/**
 * Class allowing to build requests targeting AWS APIs
 *
 * This class is meant to be used as a base class for specific
 * services clients. See S3Client or SecretsManagerClient for
 * usage examples.
 */
export class AWSClient {
  readonly awsConfig: AWSConfig;
  readonly serviceName: string;

  // Because jslib-aws is mostly used as a way to setup or feed k6 tests, and
  // we want the jslib-aws to be able to disregard k6's discardResponseBodies: meaning
  // that for instance, even when setting discardResponseBodies to true in the k6 options, using
  // s3.getObject still receives the underlying response body and returns data to the user.
  //
  // To achieve this, we set the responseType to 'text' in the baseRequestParams, as it
  // will lead the http module to ignore the discardResponseBodies option.
  //
  // AWS Client classes can override this value if they want to receive the response body
  // as a different type ('binary' for instance, e.g. S3Client.getObject).
  //
  // See #45: https://github.com/grafana/k6-jslib-aws/issues/45
  readonly baseRequestParams: Params = {
    responseType: "text",
  };

  private _endpoint?: Endpoint;

  /**
   * @param {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
   * @param  {string} serviceName - name of the service to target.
   * @param  {URIEncodingConfig} URIencodingConfig - configures how requests URIs should be encoded.
   */
  constructor(awsConfig: AWSConfig, serviceName: string) {
    this.awsConfig = awsConfig;
    this.serviceName = serviceName;

    // If an endpoint is provided in the config, set it
    // to ensure the default endpoint is not used.
    if (awsConfig.endpoint != undefined) {
      this._endpoint = awsConfig.endpoint;
    }
  }

  /**
   * Represents the endpoint URL of the AWS service.
   *
   * If no custom endpoint is set, a default endpoint will be constructed
   * using the service name and region provided in the AWS config.
   *
   * @type {Endpoint}
   * @public
   */
  public get endpoint() {
    if (this._endpoint == undefined) {
      this._endpoint = new Endpoint(
        `https://${this.serviceName}.${this.awsConfig.region}.amazonaws.com`,
      );
    }
    return this._endpoint;
  }

  /**
   * Updates the endpoint URL of the AWS service.
   *
   * This can be used to override the default AWS service endpoint or set a custom endpoint.
   *
   * @param {Endpoint} endpoint - The new endpoint to set for the AWS service.
   * @public
   */
  public set endpoint(endpoint: Endpoint) {
    this._endpoint = endpoint;
  }

  /**
   * Handles the k6 http response potential errors produced when making a
   * request to an AWS service.
   *
   * Importantly, this method only handles errors that emerge from the k6 http client itself, and
   * won't handle AWS specific errors. To handle AWS specific errors, client classes are
   * expected to implement their own error handling logic by overriding this method.
   *
   * @param response {RefinedResponse<ResponseType | undefined>} the response received by the k6 http client
   * @param operation {string | undefined } the name of the operation that was attempted when the error occurred
   * @param {boolean} returns true if an error was handled, false otherwise
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleError(
    response: RefinedResponse<ResponseType | undefined>,
    _operation?: string,
  ): boolean {
    const status: number = response.status;
    const errorCode: number = response.error_code;
    const errorMessage: string = response.error;

    // We consider codes 200-299 as success.
    //
    // We do not consider 3xx as success as some services such as S3 can use
    // 301 to indicate a bucket not found
    if (
      status >= 200 && status < 300 && errorMessage == "" && errorCode === 0
    ) {
      return false;
    }

    switch (errorCode) {
      case GeneralErrorKind.GenericError:
      case GeneralErrorKind.NonTCPNetworkError:
      case GeneralErrorKind.InvalidURL:
      case GeneralErrorKind.HTTPRequestTimeout:
        throw new GeneralError(errorCode);
      case DNSErrorKind.GenericDNSError:
      case DNSErrorKind.NoIPFound:
      case DNSErrorKind.BlacklistedIP:
      case DNSErrorKind.BlacklistedHostname:
        throw new DNSError(errorCode);
      case TCPErrorKind.GenericTCPError:
      case TCPErrorKind.BrokenPipeOnWrite:
      case TCPErrorKind.UnknownTCPError:
      case TCPErrorKind.GeneralTCPDialError:
      case TCPErrorKind.DialTimeoutError:
      case TCPErrorKind.DialConnectionRefused:
      case TCPErrorKind.DialUnknownError:
      case TCPErrorKind.ResetByPeer:
        throw new TCPError(errorCode);
      case TLSErrorKind.GeneralTLSError:
      case TLSErrorKind.UnknownAuthority:
      case TLSErrorKind.CertificateHostnameMismatch:
        throw new TLSError(errorCode);
      case HTTP2ErrorKind.GenericHTTP2Error:
      case HTTP2ErrorKind.GeneralHTTP2GoAwayError:
        throw new HTTP2Error(errorCode);
    }

    return true;
  }
}

/**
 * Type alias representing the result of an AWSClient.buildRequest call
 */
export interface AWSRequest {
  readonly url: string;
  readonly headers: HTTPHeaders;
}
