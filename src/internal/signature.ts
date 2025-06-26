import crypto from "k6/crypto";
import { bytes } from "k6";

import * as constants from "./constants.ts";
import { AWSError } from "./error.ts";
import {
  hasHeader,
  HTTPHeaderBag,
  HTTPRequest,
  QueryParameterBag,
  SignedHTTPRequest,
} from "./http.ts";
import { isArrayBuffer } from "./utils.ts";

/**
 * SignatureV4 can be used to sign HTTP requests and presign URLs using the AWS Signature
 * Version 4 signing process.
 *
 * It offers two signing methods:
 * - sign: signs the request headers and payload
 * - presign: returns a presigned (authorization information contained in the query string) URL
 *
 * @see https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html
 */
export class SignatureV4 {
  /**
   * The name of the service to sign for.
   */
  private readonly service: string;

  /**
   * The name of the region to sign for.
   */
  private readonly region: string;

  /**
   * The credentials with which the request should be signed.
   */
  private readonly credentials: Credentials;

  /**
   * Whether to uri-escape the request URI path as part of computing the
   * canonical request string. This is required for every AWS service, except
   * Amazon S3, as of late 2017.
   *
   * @default [true]
   */
  private readonly uriEscapePath: boolean;

  /**
   * Whether to calculate a checksum of the request body and include it as
   * either a request header (when signing) or as a query string parameter
   * (when presigning). This is required for AWS Glacier and Amazon S3 and optional for
   * every other AWS service as of late 2017.
   *
   * @default [true]
   */
  private readonly applyChecksum: boolean;

  // TODO: uriEscapePath and applyChecksum should not be present in the constructor
  constructor({
    service,
    region,
    credentials,
    uriEscapePath,
    applyChecksum,
  }: SignatureV4Options) {
    this.service = service;
    this.region = region;
    this.credentials = credentials;
    this.uriEscapePath = typeof uriEscapePath === "boolean"
      ? uriEscapePath
      : true;
    this.applyChecksum = typeof applyChecksum === "boolean"
      ? applyChecksum
      : true;
  }

  /**
   * Includes AWS v4 signing information to the provided HTTP request.
   *
   * This method adds an Authorization header to the request, containing
   * the signature and other signing information. It also returns a preformatted
   * URL that can be used to make the k6 http request.
   *
   * This method mutates the request object.
   *
   * @param request {HTTPRequest} The request to sign.
   * @param options {Partial<RequestSigningOptions>} Options for signing the request.
   * @returns {SignedHTTPRequest} The signed request.
   */
  sign(
    request: HTTPRequest,
    options: Partial<RequestSigningOptions> = {},
  ): SignedHTTPRequest {
    // Set default values for options which are not provided by the user.
    const defaultOptions = {
      signingDate: new Date(),
      unsignableHeaders: new Set<string>(),
      signableHeaders: new Set<string>(),
    };

    // Merge default options with the ones maybe provided by the user.
    const finalOptions = { ...defaultOptions, ...options };

    const { longDate, shortDate }: DateInfo = formatDate(
      finalOptions.signingDate,
    );
    const service = finalOptions.signingService || this.service;
    const region = finalOptions.signingRegion || this.region;
    const scope =
      `${shortDate}/${region}/${service}/${constants.KEY_TYPE_IDENTIFIER}`;

    // Required by the specification:
    //   "For HTTP/1.1 requests, you must include the host header at a minimum.
    //   Standard headers like content-type are optional.
    //   For HTTP/2 requests, you must include the :authority header instead of
    //   the host header. Different services might require other headers."
    if (!request.headers[constants.HOST_HEADER]) {
      request.headers[constants.HOST_HEADER] = request.endpoint.hostname;
    }

    // Filter out headers that will be generated and managed by the signing process.
    // If the user provide any of those as part of the HTTPRequest's headers, they
    // will be ignored.
    for (const headerName of Object.keys(request.headers)) {
      if (constants.GENERATED_HEADERS.indexOf(headerName.toLowerCase()) > -1) {
        delete request.headers[headerName];
      }
    }

    request.headers[constants.AMZ_DATE_HEADER] = longDate;
    if (this.credentials.sessionToken) {
      request.headers[constants.AMZ_TOKEN_HEADER] =
        this.credentials.sessionToken;
    }

    // If the request body is a typed array, we need to convert it to a buffer
    // so that we can calculate the checksum.
    if (ArrayBuffer.isView(request.body)) {
      request.body = request.body.buffer;
    }

    // Ensure we avoid passing undefined to the crypto hash function.
    if (!request.body) {
      request.body = "";
    }

    const payloadHash = this.computePayloadHash(request);
    if (
      !hasHeader(constants.AMZ_CONTENT_SHA256_HEADER, request.headers) &&
      this.applyChecksum
    ) {
      request.headers[constants.AMZ_CONTENT_SHA256_HEADER] = payloadHash;
    }

    const canonicalHeaders = this.computeCanonicalHeaders(
      request,
      finalOptions.unsignableHeaders,
      finalOptions.signableHeaders,
    );
    const signature = this.calculateSignature(
      longDate,
      scope,
      this.deriveSigningKey(this.credentials, service, region, shortDate),
      this.createCanonicalRequest(request, canonicalHeaders, payloadHash),
    );

    /**
     * Step 4 of the signing process: add the signature to the HTTP request's headers.
     *
     * @see https://docs.aws.amazon.com/general/latest/gr/sigv4-add-signature-to-request.html
     */
    request.headers[constants.AUTHORIZATION_HEADER] =
      `${constants.SIGNING_ALGORITHM_IDENTIFIER} ` +
      `Credential=${this.credentials.accessKeyId}/${scope}, ` +
      `SignedHeaders=${Object.keys(canonicalHeaders).sort().join(";")}, ` +
      `Signature=${signature}`;

    // If a request path was provided, add it to the URL
    let url = request.endpoint.href;
    if (request.path) {
      // Ensure the URI and the request path are properly concatenated
      // by adding a trailing slash to the URI if it's missing.
      if (!url.endsWith("/") && !request.path.startsWith("/")) {
        url += "/";
      }

      // Append the path to the URL
      url += request.path;
    }

    // If a request query string was provided, add it to the URL
    if (request.query) {
      // We exclude the signature from the query string
      url += `?${this.serializeQueryParameters(request.query)}`;
    }

    return {
      url: url,
      ...request,
    };
  }

  /**
   * Produces a presigned URL with AWS v4 signature information for the provided HTTP request.
   *
   * A presigned URL is a URL that contains the authorization information
   * (signature and other signing information) in the query string. This method
   * returns a preformatted URL that can be used to make the k6 http request.
   *
   * @param originalRequest - The original request to presign.
   * @param options - Options controlling the signing of the request.
   * @returns A signed request, including the presigned URL.
   */
  presign(
    originalRequest: HTTPRequest,
    options: PresignOptions = {},
  ): SignedHTTPRequest {
    const {
      signingDate = new Date(),
      expiresIn = 3600,
      unsignableHeaders,
      unhoistableHeaders,
      signableHeaders,
      signingRegion,
      signingService,
    } = options;
    const { longDate, shortDate }: DateInfo = formatDate(signingDate);
    const region = signingRegion || this.region;
    const service = signingService || this.service;

    if (expiresIn > constants.MAX_PRESIGNED_TTL) {
      throw new InvalidSignatureError(
        "Signature version 4 presigned URLs can't be valid for more than 7 days",
      );
    }

    const scope =
      `${shortDate}/${region}/${service}/${constants.KEY_TYPE_IDENTIFIER}`;
    const request = this.moveHeadersToQuery(originalRequest, {
      unhoistableHeaders,
    });

    // Required by the specification:
    //   "For HTTP/1.1 requests, you must include the host header at a minimum.
    //   Standard headers like content-type are optional.
    //   For HTTP/2 requests, you must include the :authority header instead of
    //   the host header. Different services might require other headers."
    if (!request.headers[constants.HOST_HEADER]) {
      request.headers[constants.HOST_HEADER] =
        originalRequest.endpoint.hostname;
    }

    // If the user provided a session token, include it in the signed url query string.
    if (this.credentials.sessionToken) {
      request.query[constants.AMZ_TOKEN_QUERY_PARAM] =
        this.credentials.sessionToken;
    }
    // Add base signing query parameters to the request, as described in the documentation
    // @see https://docs.aws.amazon.com/general/latest/gr/sigv4-add-signature-to-request.html
    request.query[constants.AMZ_ALGORITHM_QUERY_PARAM] =
      constants.SIGNING_ALGORITHM_IDENTIFIER;
    request.query[
      constants.AMZ_CREDENTIAL_QUERY_PARAM
    ] = `${this.credentials.accessKeyId}/${scope}`;
    request.query[constants.AMZ_DATE_QUERY_PARAM] = longDate;
    request.query[constants.AMZ_EXPIRES_QUERY_PARAM] = expiresIn.toString(10);

    const canonicalHeaders = this.computeCanonicalHeaders(
      request,
      unsignableHeaders,
      signableHeaders,
    );
    request.query[constants.AMZ_SIGNED_HEADERS_QUERY_PARAM] = Object.keys(
      canonicalHeaders,
    )
      .sort()
      .join(";");

    const signingKey = this.deriveSigningKey(
      this.credentials,
      service,
      region,
      shortDate,
    );

    // Computing the payload from the original request. This is required
    // in the event the user attempts to produce a presigned URL for s3,
    // which requires the payload hash to be 'UNSIGNED-PAYLOAD'.
    //
    // To that effect, users need to set the 'x-amz-content-sha256' header,
    // and mark it as unhoistable and unsignable. When setup this way,
    // the computePayloadHash method will then return the string 'UNSIGNED-PAYLOAD'.
    const payloadHash = this.computePayloadHash(originalRequest);
    const canonicalRequest = this.createCanonicalRequest(
      request,
      canonicalHeaders,
      payloadHash,
    );

    request.query[constants.AMZ_SIGNATURE_QUERY_PARAM] = this
      .calculateSignature(
        longDate,
        scope,
        signingKey,
        canonicalRequest,
      );

    // If a request path was provided, add it to the URL
    let url = originalRequest.endpoint.href;
    if (request.path) {
      // Ensure there is a trailing slash at the end of the URL
      // so that appending the path does not result in a malformed URL.
      if (!url.endsWith("/") && !request.path.startsWith("/")) {
        url += "/";
      }

      // Append the path to the URL
      url += request.path;
    }

    // If a request query string was provided, add it to the URL
    if (request.query) {
      url += `?${this.serializeQueryParameters(request.query)}`;
    }

    return { url: url, ...request };
  }

  /**
   * Create a string including information from your request
   * in a AWS signature v4 standardized (canonical) format.
   *
   * Step 1 of the signing process: create the canonical request string.
   * @see https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
   *
   * @param request {HTTPRequest} The request to sign.
   * @param canonicalHeaders {HTTPHeaderBag} The request's canonical headers.
   * @param payloadHash {string} The hexadecimally encoded request's payload hash .
   * @returns {string} The canonical request string.
   */
  private createCanonicalRequest(
    request: HTTPRequest,
    canonicalHeaders: HTTPHeaderBag,
    payloadHash: string,
  ): string {
    const sortedHeaders = Object.keys(canonicalHeaders).sort();
    const sortedCanonicalHeaders = sortedHeaders
      .map((name) => `${name}:${canonicalHeaders[name]}`)
      .join("\n");
    const signedHeaders = sortedHeaders.join(";");

    return (
      `${request.method}\n` +
      `${this.computeCanonicalURI(request)}\n` +
      `${this.computeCanonicalQuerystring(request)}\n` +
      `${sortedCanonicalHeaders}\n\n` +
      `${signedHeaders}\n` +
      `${payloadHash}`
    );
  }

  /**
   * Create the "string to sign" part of the signature Version 4 protocol.
   *
   * The "string to sign" includes meta information about your request and
   * about the canonical request that you created with `createCanonicalRequest`.
   * It is used hand in hand with the signing key to create the request signature.
   * Step 2 of the signing process: create the string to sign.
   * @see https://docs.aws.amazon.com/general/latest/gr/sigv4-create-string-to-sign.html
   *
   * @param longDate {string} The request's date in iso 8601 format.
   * @param credentialScope {string} The request's credential scope.
   * @param canonicalRequest {string} The request's canonical request.
   * @returns {string} The "string to sign".
   */
  private createStringToSign(
    longDate: string,
    credentialScope: string,
    canonicalRequest: string,
  ): string {
    const hashedCanonicalRequest = crypto.sha256(canonicalRequest, "hex");

    return (
      `${constants.SIGNING_ALGORITHM_IDENTIFIER}\n` +
      `${longDate}\n` +
      `${credentialScope}\n` +
      `${hashedCanonicalRequest}`
    );
  }

  /**
   * Calculte the signature for AWS signature version 4.
   *
   * Step 3 of the signing process: create the signature.
   * @see https://docs.aws.amazon.com/general/latest/gr/sigv4-calculate-signature.html
   *
   * @param longDate {string} The request's date in iso 8601 format.
   * @param credentialScope {string} The request's credential scope.
   * @param signingKey {string} the signing key as computed by the deriveSigningKey method.
   * @param canonicalRequest {string} The request's canonical request.
   * @returns {string} The signature.
   */
  private calculateSignature(
    longDate: string,
    credentialScope: string,
    signingKey: Uint8Array,
    canonicalRequest: string,
  ): string {
    const stringToSign = this.createStringToSign(
      longDate,
      credentialScope,
      canonicalRequest,
    );
    return crypto.hmac("sha256", signingKey, stringToSign, "hex");
  }

  /**
   * Derives the signing key for authenticating requests signed with
   * the Signature version 4 authentication protocol.
   *
   * deriveSigningKey produces a signing key by creating a series of
   * hash-based message authentication codes (HMACs) represented in
   * a binary format.
   *
   * The derived signing key is specific to the date it's made at, as well as
   * the service and region it targets.
   *
   * @param credentials {AWSCredentials} The credentials to use for signing.
   * @param service {string} The service the request is targeted at.
   * @param region {string} The region the request is targeted at.
   * @param shortDate {string} The request's date in YYYYMMDD format.
   * @returns {Uint8Array} The derived signing key.
   */
  private deriveSigningKey(
    credentials: Credentials,
    service: string,
    region: string,
    shortDate: string,
  ): Uint8Array {
    const kSecret: string = credentials.secretAccessKey;

    // First HMAC: string secret -> bytes
    const kDateBytes: bytes = crypto.hmac(
      "sha256",
      "AWS4" + kSecret,
      shortDate,
      "binary",
    );
    const kDate = bytesToUint8Array(kDateBytes);

    // Second HMAC: ArrayBuffer secret -> bytes
    const kRegionBytes: bytes = crypto.hmac(
      "sha256",
      uint8ArrayToArrayBuffer(kDate),
      region,
      "binary",
    );
    const kRegion = bytesToUint8Array(kRegionBytes);

    // Third HMAC: ArrayBuffer secret -> bytes
    const kServiceBytes: bytes = crypto.hmac(
      "sha256",
      uint8ArrayToArrayBuffer(kRegion),
      service,
      "binary",
    );
    const kService = bytesToUint8Array(kServiceBytes);

    // Fourth HMAC: ArrayBuffer secret -> bytes
    const kSigningBytes: bytes = crypto.hmac(
      "sha256",
      uint8ArrayToArrayBuffer(kService),
      "aws4_request",
      "binary",
    );
    const kSigning = bytesToUint8Array(kSigningBytes);

    return kSigning;
  }

  /**
   * Create a string that includes information from your request
   * in a AWS signature v4 standardized (canonical) format.
   *
   * @param param0 {HTTPRequest} The request to sign.
   * @returns {string} The canonical URI.
   */
  private computeCanonicalURI({ path }: HTTPRequest): string {
    if (this.uriEscapePath) {
      // Non-S3 services, we normalize the path and then double URI encode it.
      // Ref: "Remove Dot Segments" https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
      const normalizedURISegments = [];

      for (const URISegment of path.split("/")) {
        if (URISegment?.length === 0) {
          continue;
        }

        if (URISegment === ".") {
          continue;
        }

        if (URISegment === "..") {
          normalizedURISegments.pop();
        } else {
          normalizedURISegments.push(URISegment);
        }
      }

      // Normalize the URI
      const leading = path?.startsWith("/") ? "/" : "";
      const URI = normalizedURISegments.join("/");
      const trailing = normalizedURISegments.length > 0 && path?.endsWith("/")
        ? "/"
        : "";
      const normalizedURI = `${leading}${URI}${trailing}`;

      const doubleEncoded = encodeURIComponent(normalizedURI);

      return doubleEncoded.replace(/%2F/g, "/");
    }

    // For S3, we shouldn't normalize the path. For example, object name
    // my-object//example//photo.user should not be normalized to
    // my-object/example/photo.user
    return path;
  }

  /**
   * Serializes the request's query parameters into their canonical
   * string version. If the request does not include a query parameters,
   * returns an empty string.
   *
   * @param param0 {HTTPRequest} The request containing the query parameters.
   * @returns {string} The canonical query string.
   */
  private computeCanonicalQuerystring({ query = {} }: HTTPRequest): string {
    const keys: Array<string> = [];
    const serialized: Record<string, string> = {};

    for (const key of Object.keys(query).sort()) {
      if (key.toLowerCase() === constants.AMZ_SIGNATURE_HEADER) {
        continue;
      }

      keys.push(key);
      const value = query[key];

      if (typeof value === "string") {
        serialized[key] = `${escapeURI(key)}=${escapeURI(value)}`;
      } else if (Array.isArray(value)) {
        serialized[key] = value
          .slice(0)
          .sort()
          .reduce(
            (encoded: Array<string>, value: string) =>
              encoded.concat([`${escapeURI(key)}=${escapeURI(value)}`]),
            [],
          )
          .join("&");
      }
    }

    return keys
      .map((key) => serialized[key])
      .filter((serialized) => serialized)
      .join("&");
  }

  /**
   * Create the canonical form of the request's headers.
   * Canonical headers consist of all the HTTP headers you
   * are including with the signed request.
   *
   * @param param0 {HTTPRequest} The request to compute the canonical headers of.
   * @param unsignableHeaders {Set<string>} The headers that should not be signed.
   * @param signableHeaders {Set<string>} The headers that should be signed.
   * @returns {string} The canonical headers.
   */
  private computeCanonicalHeaders(
    { headers }: HTTPRequest,
    unsignableHeaders?: Set<string>,
    signableHeaders?: Set<string>,
  ): HTTPHeaderBag {
    const canonicalHeaders: HTTPHeaderBag = {};

    for (const headerName of Object.keys(headers).sort()) {
      if (headers[headerName] == undefined) {
        continue;
      }

      const canonicalHeaderName = headerName.toLowerCase();
      if (
        canonicalHeaderName in constants.ALWAYS_UNSIGNABLE_HEADERS ||
        unsignableHeaders?.has(canonicalHeaderName)
      ) {
        if (
          !signableHeaders ||
          (signableHeaders && !signableHeaders.has(canonicalHeaderName))
        ) {
          continue;
        }
      }

      if (typeof headers[headerName] === "string") {
        canonicalHeaders[canonicalHeaderName] =
          headers[headerName] =
            headers[headerName]
              .trim()
              .replace(/\s+/g, " ");
      }
    }

    return canonicalHeaders;
  }

  /**
   * Computes the SHA256 cryptographic hash of the request's body.
   *
   * If the headers contain the 'X-Amz-Content-Sha256' header, then
   * the value of that header is returned instead. This proves useful
   * when, for example, presiging a URL for S3, as the payload hash
   * must always be equal to 'UNSIGNED-PAYLOAD'.
   *
   * @param param0 {HTTPRequest} The request to compute the payload hash of.
   * @returns {string} The hex encoded SHA256 payload hash, or the value of the 'X-Amz-Content-Sha256' header.
   */
  private computePayloadHash({ headers, body }: HTTPRequest): string {
    // for (const headerName of Object.keys(headers)) {
    //     // If the header is present, return its value.
    //     // So that we let the 'UNSIGNED-PAYLOAD' value pass through.
    //     if (headerName.toLowerCase() === constants.AMZ_CONTENT_SHA256_HEADER) {
    //         return headers[headerName]
    //     }
    // }

    if (headers[constants.AMZ_CONTENT_SHA256_HEADER]) {
      return headers[constants.AMZ_CONTENT_SHA256_HEADER];
    }

    if (body == undefined) {
      return constants.EMPTY_SHA256;
    }

    if (typeof body === "string" || isArrayBuffer(body)) {
      return crypto.sha256(body, "hex").toLowerCase();
    }

    if (ArrayBuffer.isView(body)) {
      // If the request body is a typed array, we need to convert it to a buffer
      // so that we can calculate the checksum.
      return crypto.sha256((body as DataView).buffer, "hex").toLowerCase();
    }

    return constants.UNSIGNED_PAYLOAD;
  }

  /**
   * Moves a request's headers to its query parameters.
   *
   * The operation will ignore any amazon standard headers, prefixed
   * with 'X-Amz-'. It will also ignore any headers specified as unhoistable
   * by the options.
   *
   * The operation will delete the headers from the request.
   *
   * @param request {HTTPRequest} The request to move the headers from.
   * @param options
   * @returns {HTTPRequest} The request with the headers moved to the query parameters.
   */
  private moveHeadersToQuery(
    request: HTTPRequest,
    options: { unhoistableHeaders?: Set<string> } = {},
  ): HTTPRequest & { query: QueryParameterBag } {
    const requestCopy = JSON.parse(JSON.stringify(request));
    const { headers, query = {} as QueryParameterBag } = requestCopy;

    for (const name of Object.keys(headers)) {
      const lowerCaseName = name.toLowerCase();
      if (
        lowerCaseName.slice(0, 6) === "x-amz-" &&
        !options.unhoistableHeaders?.has(lowerCaseName)
      ) {
        query[name] = headers[name];
        delete headers[name];
      }
    }

    return {
      ...requestCopy,
      headers,
      query,
    };
  }

  /**
   * Serializes a HTTPRequest's query parameter bag into a string.
   *
   * @param query {QueryParameterBag} The query parameters to serialize.
   * @param ignoreKeys {Set<string>} The keys to ignore.
   * @returns {string} The serialized, and ready to use in a URL, query parameters.
   */
  private serializeQueryParameters(
    query: QueryParameterBag,
    ignoreKeys?: string[],
  ): string {
    const keys: Array<string> = [];
    const serialized: Record<string, string> = {};

    for (const key of Object.keys(query).sort()) {
      if (ignoreKeys?.includes(key.toLowerCase())) {
        continue;
      }

      keys.push(key);
      const value = query[key];

      if (typeof value === "string") {
        serialized[key] = `${escapeURI(key)}=${escapeURI(value)}`;
      } else if (Array.isArray(value)) {
        serialized[key] = value
          .slice(0)
          .sort()
          .reduce(
            (encoded: Array<string>, value: string) =>
              encoded.concat([`${escapeURI(key)}=${escapeURI(value)}`]),
            [],
          )
          .join("&");
      }
    }

    return keys
      .map((key) => serialized[key])
      .filter((serialized) => serialized)
      .join("&");
  }
}

/**
 * Error indicating an Invalid signature has been sent to AWS services
 *
 * Inspired from AWS official error types, as
 * described in:
 *   * https://aws.amazon.com/blogs/developer/service-error-handling-modular-aws-sdk-js/
 *   * https://github.com/aws/aws-sdk-js/blob/master/lib/error.d.ts
 */
export class InvalidSignatureError extends AWSError {
  /**
   * Constructs an InvalidSignatureError
   *
   * @param  {string} message - human readable error message
   */
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = "InvalidSignatureError";
  }
}

export interface SignatureV4Options {
  /**
   * The name of the service to sign for.
   */
  service: string;

  /**
   * The name of the region to sign for.
   */
  region: string;

  /**
   * The credentials with which the request should be signed.
   */
  credentials: Credentials;

  /**
   * Whether to uri-escape the request URI path as part of computing the
   * canonical request string. This is required for every AWS service, except
   * Amazon S3, as of late 2017.
   *
   * @default [true]
   */
  uriEscapePath?: boolean;

  /**
   * Whether to calculate a checksum of the request body and include it as
   * either a request header (when signing) or as a query string parameter
   * (when presigning). This is required for AWS Glacier and Amazon S3 and optional for
   * every other AWS service as of late 2017.
   *
   * @default [true]
   */
  applyChecksum?: boolean;
}

export interface SignOptions {
  /**
   * The date and time to be used as signature metadata. This value should be
   * a Date object, a unix (epoch) timestamp, or a string that can be
   * understood by the JavaScript `Date` constructor.If not supplied, the
   * value returned by `new Date()` will be used.
   */
  signingDate?: Date;

  /**
   * The service signing name. It will override the service name of the signer
   * in current invocation
   */
  signingService?: string;

  /**
   * The region name to sign the request. It will override the signing region of the
   * signer in current invocation
   */
  signingRegion?: string;
}

export interface RequestSigningOptions extends SignOptions {
  /**
   * A set of strings whose members represents headers that cannot be signed.
   * All headers in the provided request will have their names converted to
   * lower case and then checked for existence in the unsignableHeaders set.
   */
  unsignableHeaders?: Set<string>;

  /**
   * A set of strings whose members represents headers that should be signed.
   * Any values passed here will override those provided via unsignableHeaders,
   * allowing them to be signed.
   *
   * All headers in the provided request will have their names converted to
   * lower case before signing.
   */
  signableHeaders?: Set<string>;
}

export interface PresignOptions extends RequestSigningOptions {
  /**
   * The number of seconds before the presigned URL expires
   */
  expiresIn?: number;

  /**
   * A set of strings whose representing headers that should not be hoisted
   * to presigned request's query string. If not supplied, the presigner
   * moves all the AWS-specific headers (starting with `x-amz-`) to the request
   * query string. If supplied, these headers remain in the presigned request's
   * header.
   * All headers in the provided request will have their names converted to
   * lower case and then checked for existence in the unhoistableHeaders set.
   */
  unhoistableHeaders?: Set<string>;
}

export interface Credentials {
  /**
   * AWS access key ID
   */
  readonly accessKeyId: string;

  /**
   * AWS secret access key
   */
  readonly secretAccessKey: string;

  /**
   * A security or session token to use with these credentials. Usually
   * present for temporary credentials.
   */
  readonly sessionToken?: string;
}

export interface DateInfo {
  /**
   * ISO8601 formatted date string
   */
  longDate: string;

  /**
   * String in the format YYYYMMDD
   */
  shortDate: string;
}

/**
 * Converts k6's bytes (number[]) to Uint8Array for proper typing.
 * k6's crypto.hmac with 'binary' encoding returns bytes (number[]), but subsequent
 * HMAC operations need ArrayBuffer input, and our function signature requires Uint8Array.
 *
 * @param bytes {bytes} The bytes array from k6's crypto operations.
 * @returns {Uint8Array} The converted Uint8Array.
 */
function bytesToUint8Array(bytes: bytes): Uint8Array {
  return new Uint8Array(bytes);
}

/**
 * Converts Uint8Array to ArrayBuffer for HMAC secret parameter.
 * k6's crypto.hmac accepts string | ArrayBuffer as secret, so we convert our Uint8Array
 * to ArrayBuffer for chained HMAC operations.
 *
 * @param uint8Array {Uint8Array} The Uint8Array to convert.
 * @returns {ArrayBuffer} The converted ArrayBuffer.
 */
function uint8ArrayToArrayBuffer(uint8Array: Uint8Array): ArrayBuffer {
  return uint8Array.buffer.slice(
    uint8Array.byteOffset,
    uint8Array.byteOffset + uint8Array.byteLength,
  );
}

/**
 * Escapes a URI following the AWS signature v4 escaping rules.
 *
 * @param URI {string} The URI to escape.
 * @returns {string} The escaped URI.
 */
function escapeURI(URI: string): string {
  const hexEncode = (c: string): string => {
    return `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
  };

  return encodeURIComponent(URI).replace(/[!'()*]/g, hexEncode);
}

/**
 * formatDate formats a Date object into a ISO8601 formatted date string
 * and a string in the format YYYYMMDD.
 *
 * @param date {Date} The date to format.
 * @returns {DateInfo} The formatted date.
 */
function formatDate(date: Date): DateInfo {
  const longDate = iso8601(date).replace(/[-:]/g, "");
  return {
    longDate,
    shortDate: longDate.slice(0, 8),
  };
}

/**
 * Formats a time into an ISO 8601 string.
 *
 * @see https://en.wikipedia.org/wiki/ISO_8601
 *
 * @param time {number | string | Date} The time to format.
 * @returns {string} The ISO 8601 formatted time.
 */
function iso8601(time: number | string | Date): string {
  return toDate(time)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

/**
 * Converts a time value into a Date object.
 *
 * @param time {number | string | Date} The time to convert.
 * @returns {Date} The resulting Date object.
 */
function toDate(time: number | string | Date): Date {
  if (typeof time === "number") {
    return new Date(time * 1000);
  }

  if (typeof time === "string") {
    if (Number(time)) {
      return new Date(Number(time) * 1000);
    }

    return new Date(time);
  }

  return time;
}
