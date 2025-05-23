/**
 * Standard Amazon AWS query parameter names
 */
export const AMZ_ALGORITHM_QUERY_PARAM = "X-Amz-Algorithm";
export const AMZ_CREDENTIAL_QUERY_PARAM = "X-Amz-Credential";
export const AMZ_DATE_QUERY_PARAM = "X-Amz-Date";
export const AMZ_EXPIRES_QUERY_PARAM = "X-Amz-Expires";
export const AMZ_SIGNATURE_QUERY_PARAM = "X-Amz-Signature";
export const AMZ_SIGNED_HEADERS_QUERY_PARAM = "X-Amz-SignedHeaders";
export const AMZ_TARGET_QUERY_PARAM = "X-Amz-Target";
export const AMZ_TOKEN_QUERY_PARAM = "X-Amz-Security-Token";

/**
 * Standard Amazon AWS header names
 */
export const AMZ_CONTENT_SHA256_HEADER = "x-amz-content-sha256";
export const AMZ_DATE_HEADER = AMZ_DATE_QUERY_PARAM.toLowerCase();
export const AMZ_SIGNATURE_HEADER = AMZ_SIGNATURE_QUERY_PARAM.toLowerCase();
export const AMZ_TARGET_HEADER = AMZ_TARGET_QUERY_PARAM.toLowerCase();
export const AMZ_TOKEN_HEADER = AMZ_TOKEN_QUERY_PARAM.toLowerCase();

/**
 * Common HTTP headers we rely on in the signing process
 */
export const AUTHORIZATION_HEADER = "authorization";
export const DATE_HEADER = "date";

/**
 * Lists the headers that are generated as part of the signature process.
 */
export const GENERATED_HEADERS = [
  AUTHORIZATION_HEADER,
  AMZ_DATE_HEADER,
  DATE_HEADER,
];
export const HOST_HEADER = "host";

/**
 * Lists the headers that should never be included in the
 * request signature signature process.
 */
export const ALWAYS_UNSIGNABLE_HEADERS = {
  authorization: true,
  "cache-control": true,
  connection: true,
  expect: true,
  from: true,
  "keep-alive": true,
  "max-forwards": true,
  pragma: true,
  referer: true,
  te: true,
  trailer: true,
  "transfer-encoding": true,
  upgrade: true,
  "user-agent": true,
  "x-amzn-trace-id": true,
};

/**
 * Signature specific constants included in the signing process
 */
export const KEY_TYPE_IDENTIFIER = "aws4_request";
export const SIGNING_ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256";

/**
 * Maximum time to live of a signed request in seconds: 7 days.
 */
export const MAX_PRESIGNED_TTL = 60 * 60 * 24 * 7;

/**
 * SHA256 hash of an empty string (so we don't waste cycles recomputing it)
 */
export const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/**
 * SHA256 hash of the unsigned payload constant (so we don't waste cycles recomputing it)
 */
export const UNSIGNED_PAYLOAD_SHA256 =
  "5a41b0751e4537c6ff868564ab44a4d4ecceec2ec5b1c5f74d97422968e04237";

export const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
