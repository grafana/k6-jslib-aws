import { JSONObject } from "./json.ts";
import { parseHTML } from "k6/html";
import { Response } from "k6/http";

/**
 * Base class to derive errors from
 *
 * Inspired from AWS official error types, as
 * described in:
 *   * https://aws.amazon.com/blogs/developer/service-error-handling-modular-aws-sdk-js/
 *   * https://github.com/aws/aws-sdk-js/blob/master/lib/error.d.ts
 */
export class AWSError extends Error {
  /**
   * Error code issued by the service (if any)
   */
  code?: string;

  /**
   * Create an AWSError
   *
   * @param {string} message - A longer human readable error message.
   * @param {string?} code - A unique short code representing the error that was emitted
   */
  constructor(message: string, code?: string) {
    super(message);
    this.name = "AWSError";
    this.code = code;
  }

  /**
   * Parse an AWSError from an XML document
   *
   * @param  {string} xmlDocument - Serialized XML document to parse the error from
   * @returns {AWSError} - The parsed AWSError object
   */
  static parseXML(xmlDocument: string): AWSError {
    const doc = parseHTML(xmlDocument);
    return new AWSError(doc.find("Message").text(), doc.find("Code").text());
  }

  /**
   * Parse an AWSError from a Response object
   *
   * @param {Response} response - The Response object to parse the error from
   * @returns {AWSError} - The parsed AWSError object
   */
  static parse(response: Response): AWSError {
    if (response.headers["Content-Type"] === "application/json") {
      const error = (response.json() as JSONObject) || {};
      const message = error.Message ||
        error.message ||
        error.__type ||
        "An error occurred on the server side";
      const code = response.headers["X-Amzn-Errortype"] || error.__type;
      return new AWSError(message as string, code as string);
    } else {
      return AWSError.parseXML(response.body as string);
    }
  }
}

/**
 * Base class for network errors as produced by k6.
 *
 * Based on the network error handling in k6, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 *
 * @typeparam N - The name of the network error
 * @typeparam K - The kind of the network error
 */
export class NetworkError<N extends NetworkErrorName, K extends ErrorKind>
  extends Error {
  code: K;
  override name: N;

  /**
   * Create a NetworkError
   *
   * @param {N} name - The name of the network error
   * @param {K} code - The kind of the network error
   */
  constructor(name: N, code: K) {
    super(ErrorMessages[code] || "An unknown error occurred");
    this.name = name;
    this.code = code;
  }
}

/**
 * Represents a general network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export class GeneralError
  extends NetworkError<"GeneralError", GeneralErrorKind> {
  /**
   * Create a GeneralError
   *
   * @param {GeneralErrorKind} code - The kind of the general error
   */
  constructor(code: GeneralErrorKind) {
    super("GeneralError", code);
  }
}

/**
 * Represents a DNS-related network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export class DNSError extends NetworkError<"DNSError", DNSErrorKind> {
  /**
   * Create a DNSError
   *
   * @param {DNSErrorKind} code - The kind of the DNS error
   */
  constructor(code: DNSErrorKind) {
    super("DNSError", code);
  }
}

/**
 * Represents a TCP-related network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export class TCPError extends NetworkError<"TCPError", TCPErrorKind> {
  /**
   * Create a TCPError
   *
   * @param {TCPErrorKind} code - The kind of the TCP error
   */
  constructor(code: TCPErrorKind) {
    super("TCPError", code);
  }
}

/**
 * Represents a TLS-related network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export class TLSError extends NetworkError<"TLSError", TLSErrorKind> {
  /**
   * Create a TLSError
   *
   * @param {TLSErrorKind} code - The kind of the TLS error
   */
  constructor(code: TLSErrorKind) {
    super("TLSError", code);
  }
}

/**
 * Represents an HTTP/2-related network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export class HTTP2Error extends NetworkError<"HTTP2Error", HTTP2ErrorKind> {
  /**
   * Create an HTTP2Error
   *
   * @param {HTTP2ErrorKind} code - The kind of the HTTP/2 error
   */
  constructor(code: HTTP2ErrorKind) {
    super("HTTP2Error", code);
  }
}

/**
 * Represents the name of a network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
type NetworkErrorName =
  | "GeneralError"
  | "DNSError"
  | "TCPError"
  | "TLSError"
  | "HTTP2Error";

/**
 * Represents the kind of a network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
type ErrorKind =
  | GeneralErrorKind
  | DNSErrorKind
  | TCPErrorKind
  | TLSErrorKind
  | HTTP2ErrorKind;

/**
 * Represents the kind of a general network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export enum GeneralErrorKind {
  GenericError = 1000,
  NonTCPNetworkError = 1010,
  InvalidURL = 1020,
  HTTPRequestTimeout = 1050,
}

/**
 * Represents the kind of a DNS-related network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export enum DNSErrorKind {
  GenericDNSError = 1100,
  NoIPFound = 1101,
  BlacklistedIP = 1110,
  BlacklistedHostname = 1111,
}

/**
 * Represents the kind of a TCP-related network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export enum TCPErrorKind {
  GenericTCPError = 1200,
  BrokenPipeOnWrite = 1201,
  UnknownTCPError = 1202,
  GeneralTCPDialError = 1210,
  DialTimeoutError = 1211,
  DialConnectionRefused = 1212,
  DialUnknownError = 1213,
  ResetByPeer = 1220,
}

/**
 * Represents the kind of a TLS-related network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export enum TLSErrorKind {
  GeneralTLSError = 1300,
  UnknownAuthority = 1310,
  CertificateHostnameMismatch = 1311,
}

/**
 * Represents the kind of an HTTP/2-related network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
export enum HTTP2ErrorKind {
  GenericHTTP2Error = 1600,
  GeneralHTTP2GoAwayError = 1610,
}

/**
 * Error messages for each kind of network error, as described in:
 * https://grafana.com/docs/k6/latest/javascript-api/error-codes/
 */
const ErrorMessages: { [key in ErrorKind]: string } = {
  [GeneralErrorKind.GenericError]:
    "A generic error that isn’t any of the ones listed below",
  [GeneralErrorKind.NonTCPNetworkError]:
    "A non-TCP network error - this is a placeholder and there is no error currently known to trigger it",
  [GeneralErrorKind.InvalidURL]: "An invalid URL was specified",
  [GeneralErrorKind.HTTPRequestTimeout]: "The HTTP request has timed out",
  [DNSErrorKind.GenericDNSError]:
    "A generic DNS error that isn’t any of the ones listed below",
  [DNSErrorKind.NoIPFound]: "No IP for the provided host was found",
  [DNSErrorKind.BlacklistedIP]:
    "Blacklisted IP was resolved or a connection to such was tried to be established",
  [DNSErrorKind.BlacklistedHostname]:
    "Blacklisted hostname using The Block Hostnames option",
  [TCPErrorKind.GenericTCPError]:
    "A generic TCP error that isn’t any of the ones listed below",
  [TCPErrorKind.BrokenPipeOnWrite]:
    "A “broken pipe” on write - the other side has likely closed the connection",
  [TCPErrorKind.UnknownTCPError]:
    "An unknown TCP error - We got an error that we don’t recognize but it is from the operating system and has errno set on it. The message in error includes the operation(write,read) and the errno, the OS, and the original message of the error",
  [TCPErrorKind.GeneralTCPDialError]: "General TCP dial error",
  [TCPErrorKind.DialTimeoutError]:
    "Dial timeout error - the timeout for the dial was reached",
  [TCPErrorKind.DialConnectionRefused]:
    "Dial connection refused - the connection was refused by the other party on dial",
  [TCPErrorKind.DialUnknownError]: "Dial unknown error",
  [TCPErrorKind.ResetByPeer]:
    "Reset by peer - the connection was reset by the other party, most likely a server",
  [TLSErrorKind.GeneralTLSError]: "General TLS error",
  [TLSErrorKind.UnknownAuthority]:
    "Unknown authority - the certificate issuer is unknown",
  [TLSErrorKind.CertificateHostnameMismatch]:
    "The certificate doesn’t match the hostname",
  [HTTP2ErrorKind.GenericHTTP2Error]:
    "A generic HTTP/2 error that isn’t any of the ones listed below",
  [HTTP2ErrorKind.GeneralHTTP2GoAwayError]: "A general HTTP/2 GoAway error",
};
