import { Endpoint } from "./endpoint.ts";

/**
 * Type representing HTTP schemes
 */
export type HTTPScheme = "http" | "https";

/**
 * Type representing HTTP Methods
 */
export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Type alias representing HTTP Headers
 */
export type HTTPHeaders = { [key: string]: string };

/**
 * HTTPHeaderBag is a type alias representing HTTP Headers
 */
export type HTTPHeaderBag = Record<string, string>;

export function hasHeader(
  soughtHeader: string,
  headers: HTTPHeaderBag,
): boolean {
  soughtHeader = soughtHeader.toLowerCase();

  for (const headerName of Object.keys(headers)) {
    if (soughtHeader === headerName.toLowerCase()) {
      return true;
    }
  }

  return false;
}

/**
 * QueryParameterBag is a type alias representing HTTP Query Parameters
 */
export type QueryParameterBag = Record<string, string | Array<string>>;

/**
 * HTTPRequest represents an HTTP request
 */
export interface HTTPRequest {
  /**
   * The HTTP method to use
   */
  method: HTTPMethod;

  /**
   * Represents an AWS service endpoint, providing utilities for parsing and handling URL details.
   */
  endpoint: Endpoint;

  /**
   * The path to the resource
   */
  path: string;

  /**
   * The query parameters to include in the request
   */
  query?: QueryParameterBag;

  /**
   * The headers to include in the request
   */
  headers: HTTPHeaderBag;

  /**
   * The body of the request
   */
  body?: string | ArrayBuffer | null;
}

/**
 * SignedHTTPRequest represents an HTTP request that has been signed
 * with an AWS signature. It is a superset of HTTPRequest adding
 * the following fields:
 * - url: the fully qualified URL of the request that can be used in a k6 http.request.
 */
export interface SignedHTTPRequest extends HTTPRequest {
  url: string;
}
