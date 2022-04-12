'use strict'

import crypto, { hmac, sha256 } from 'k6/crypto'
import { AWSConfig } from './config'
import { AWSError } from './error'

/**
 * Includes AWS v4 signing information to the provided HTTP headers object.
 *
 * This function will compute the `Authorization` header signature for the
 * provided request components, and add it to `header`. It will do so by following
 * the procedure detailled AWS' API docs: https://docs.aws.amazon.com/general/latest/gr/sigv4-add-signature-to-request.html
 *
 * The resulting `Authorization` header value is computed for the provided
 * headers object. Thus, any modification of the headers past a call to `signHeaders`
 * would effectively invalidate their signature, and the function should be
 * called again to recompute it.
 *
 * @param  {object} headers - HTTP headers request to sign.
 * @param  {number} requestTimestamp - Timestamp of the request
 * @param  {string} method - HTTP method used
 * @param  {string} path - HTTP request URL's path
 * @param  {string} queryString - HTTP request URL's querystring
 * @param  {string | ArrayBuffer} body - HTTP request's payload
 * @param  {AWSConfig} - AWS configuration
 * @param  {string} service - AWS service name
 * @param  {URIEncodingConfig} - URI encoding configuration
 */
export function signHeaders(
    headers,
    requestTimestamp,
    method,
    path,
    queryString,
    body,
    awsConfig,
    service,
    URIencodingConfig
) {
    const derivedSigningKey = deriveSigningKey(
        awsConfig.secretAccessKey,
        requestTimestamp,
        awsConfig.region,
        service
    )

    const canonicalRequest = createCanonicalRequest(
        method,
        path,
        queryString,
        headers,
        body,
        URIencodingConfig
    )

    const stringToSign = createStringToSign(
        requestTimestamp,
        awsConfig.region,
        service,
        sha256(canonicalRequest, 'hex')
    )

    const credentialScope = createCredentialScope(requestTimestamp, awsConfig.region, service)
    const signedHeaders = createSignedHeaders(headers)
    const signature = calculateSignature(derivedSigningKey, stringToSign)
    const authorizationHeader = `${HashingAlgorithm} Credential=${awsConfig.accessKeyID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    headers['Authorization'] = authorizationHeader

    return headers
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
    constructor(message, code) {
        super(message, code)
        this.name = 'InvalidSignatureError'
    }
}

/**
 * Calculte the signature for AWS signature version 4
 *
 * @param  {string} derivedSigningKey - dervied signing key as computed by `deriveSigningKey`
 * @param  {string} stringToSign - String to sign as computed by `createStringToSign`
 * @return {string}
 */
export function calculateSignature(derivedSigningKey, stringToSign) {
    return hmac('sha256', derivedSigningKey, stringToSign, 'hex')
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
 * @param  {string} secretAccessKey - the AWS secret access key to derive the signing key for
 * @param  {number} time - timestamp of the request
 * @param  {string} region - targeted AWS region. MUST be UTF-8 encoded.
 * @param  {string} service - targeted AWS service. MUST be UTF-8 encoded.
 * @return {string}
 */
export function deriveSigningKey(secretAccessKey, time, region, service) {
    const kSecret = secretAccessKey
    const date = toDate(time)

    const kDate = hmac('sha256', 'AWS4' + kSecret, date, 'binary')
    const kRegion = hmac('sha256', kDate, region, 'binary')
    const kService = hmac('sha256', kRegion, service, 'binary')
    const kSigning = hmac('sha256', kService, 'aws4_request', 'binary')

    return kSigning
}

// Hashing Algorithm to use in the signature process
export const HashingAlgorithm = 'AWS4-HMAC-SHA256'

/**
 * Certain services, such as S3, allow for unsigned payloads. If
 *  producing a signed canonical request for such service, pass
 *  the `UnsignedPayload` constant value as the payload parameter.
 */
export const UnsignedPayload = 'UNSIGNED-PAYLOAD'

/**
 * Create the "string to sign" part of the signature Version 4 protocol.
 *
 * The "string to sign" includes meta information about your request and
 * about the canonical request that you created with `createCanonicalRequest`.
 * It is used hand in hand with the signing key to create the request signature.
 *
 * @param  {number} requestTimestamp - timestamp of the request
 * @param  {string} region - targeted AWS region. MUST be UTF-8 encoded.
 * @param  {string} service - targeted AWS service name. MUST be UTF-8 encoded.
 * @param  {string} hashedCanonicalRequest - canonical request as produced by calling the createCanonicalRequest function,
 *     hashed using the SHA256 algorithm (encoded in hexadecimal format).
 * @return {string}
 */
export function createStringToSign(requestTimestamp, region, service, hashedCanonicalRequest) {
    // the request date specified in ISO8601 format: YYYYMMDD'T'HHMMSS'Z'
    const requestDateTime = toTime(requestTimestamp)

    // The credential scope value, consisting of the date in YYYYMMDD format,
    // the targeted region, the targeted service, and a termination string.
    // Note that the region and service MUST be UTF-8 encoded.
    const credentialScope = createCredentialScope(requestTimestamp, region, service)

    const stringToSign = [
        // Algorithm
        HashingAlgorithm,

        // RequestDateTime
        requestDateTime,

        // CredentialScope
        credentialScope,

        // HashedCanonicalRequest
        hashedCanonicalRequest,
    ].join('\n')

    return stringToSign
}

/**
 *
 * Helper function creating a credential scope string to use in the signature
 * version 4 process. A credential scope consists of the date of the request
 * in YYYYMMDD format, the targeted region, the targeted service, and a
 * termination string.
 *
 * Note that the region and service MUST be UTF-8 encoded.
 *
 * @param  {number} requestTimestamp - timestamp of the request
 * @param  {string} region - targeted AWS region. MUST be UTF-8 encoded.
 * @param  {string} service - targeted AWS service name. MUST be UTF-8 encoded.
 * @return {string}
 */
export function createCredentialScope(requestTimestamp, region, service) {
    return [toDate(requestTimestamp), region, service, 'aws4_request'].join('/')
}

/**
 *  Create a string that includes information from your request
 * in a AWS signature v4 standardized (canonical) format.
 *
 * @param  {string} method - the HTTP request method
 * @param  {string} uri - URI-encoded version of the absolute path component of the URI
 * @param  {string} query - request's query string
 * @param  {Object} headers - all the HTTP headers that you wish to include with the signed request
 * @param  {String | ArrayBuffer} payload -  payload to include as the body of the request
 * @param  {URIEncodingConfig} - URI encoding configuration
 * @return {string}
 */
export function createCanonicalRequest(method, uri, query, headers, payload, URIencodingConfig) {
    const httpRequestMethod = method.toUpperCase()
    const canonicalURI = createCanonicalURI(uri, URIencodingConfig)
    const canonicalQueryString = createCanonicalQueryString(query)
    const canonicalHeaders = createCanonicalHeaders(headers)
    const signedHeaders = createSignedHeaders(headers)
    const requestPayload = createCanonicalPayload(payload)

    const canonicalRequest = [
        httpRequestMethod,
        canonicalURI,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        requestPayload,
    ].join('\n')

    return canonicalRequest
}

/**
 *  Creates the (canonical) URI-encoded version of the
 *  absolute path component of the URI: everything in the URI
 *  from the HTTP host to the question mark character ("?")
 *  that begins the query string parameters (if any).
 *
 * @param  {string} uri - URI to canonize
 * @param  {URIEncodingConfig} - URI encoding configuration
 * @return {string} - canonical URL
 */
export function createCanonicalURI(uri, URIencodingConfig) {
    if (uri == '/') {
        return uri
    }

    let canonicalURI = uri
    if (uri[uri.length - 1] == '/' && canonicalURI[canonicalURI.length - 1] != '/') {
        canonicalURI += '/'
    }

    canonicalURI = URIEncode(canonicalURI, URIencodingConfig.path)

    return URIencodingConfig.double ? URIEncode(canonicalURI, URIencodingConfig.path) : canonicalURI
}

/**
 * Creates the canonical form of the request's query
 * string. If the request does not include a query string,
 * provide an empty string.
 *
 * @param  {String | Object} qs - query string to canonize
 * @return {string}
 */
export function createCanonicalQueryString(qs) {
    if (!qs) {
        return ''
    }

    if (typeof qs == 'string') {
        qs = parseQueryString(qs)
    }

    return Object.keys(qs)
        .sort()
        .map((key) => {
            const values = Array.isArray(qs[key]) ? qs[key] : [qs[key]]
            return values
                .sort()
                .map((val) => encodeURIComponent(key) + '=' + encodeURIComponent(val))
                .join('&')
        })
        .join('&')
}
/**
 * Create the canonical form of the request's headers.
 * Canonical headers consist of all the HTTP headers you
 * are including with the signed request.
 *
 * Note that:
 *   * for HTTP/1.1 requests, the headers should at least
 * contain the `host` header.
 *   * for HTTP/2, the `:authority` header must be used instead
 * of `host`.
 *
 * @param  {Object} headers
 * @return {string}
 */
export function createCanonicalHeaders(headers) {
    if (headers.constructor !== Object || Object.entries(headers).length === 0) {
        return ''
    }

    const canonicalHeaders = Object.entries(headers)
        .map(([name, values]) => {
            const canonicalName = name.toLowerCase().trim()
            const normalizedValues = Array.isArray(values) ? values : [values]

            // Note that we do not need to sort values
            const canonicalValues = normalizedValues
                .map((v) => {
                    // convert sequential spaces to a single space
                    return v.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '')
                })
                .join(',') // standard for multiple values in a HTTP header

            return canonicalName + ':' + canonicalValues + '\n'
        })
        .sort()
        .join('')

    return canonicalHeaders
}

/**
 * Create the canonical request's signed headers.
 *
 * The signed headers part of the request contains the
 * list of headers included in the request's signing process.
 *
 * Note that:
 *   * for HTTP/1.1 requests, the `host` header must be included.
 *   * for HTTP/2 requests, the `:authority` header must be included instead
 *   of host.
 *   * if used, the `x-amz-date` header must be included.
 *
 * @param  {Object} headers
 * @return {string}
 * @throws {TypeError} - on headers not being an Object, or being empty.
 */
export function createSignedHeaders(headers) {
    if (headers.constructor !== Object) {
        throw new TypeError('headers should be an object')
    }

    if (Object.entries(headers).length === 0) {
        throw 'headers should at least contain either the Host (HTTP 1.1) or :authority (HTTP 2) parameter'
    }

    // To create the signed headers list, convert
    // all header names to lowercase, sort them by
    // character code, and use a semicolon to separate
    // the header names.
    const result = Object.keys(headers)
        .map((name) => name.toLowerCase().trim())
        .sort()
        .join(';')

    return result
}

/**
 * Create the canonical form of the request's payload.
 *
 * The canonical payload consists in a lowercased, hex encoded,
 * SHA256 hash of the requests body/payload.
 *
 * Certain services, such as S3, allow for unsigned payload. If
 * producing a signed canonical request for such service, pass
 * the `UnsignedPayload` constant value as the payload parameter.
 *
 * @param  {String | ArrayBuffer} payload
 * @return {string}
 */
export function createCanonicalPayload(payload) {
    if (payload === UnsignedPayload) {
        return payload
    }

    // Note that if the paylaod is null, we convert it
    // to an empty string.
    // TODO: Should switching to empty string if null impact headers?
    return crypto.sha256(payload || '', 'hex').toLowerCase()
}

/**
 * URIEncodes encodes every bytes of a URI to be URL-safe.
 *
 * This implementation is specific to AWS; who intended to make it as
 * close as possible to the underlying RFC 3946. It:
 *   * URI encode every byte except the unreserved characters: 'A'-'Z', 'a'-'z', '0'-'9',
 *     '-', '.', '_', and '~'.
 *   * considers the space character as a reserved character and must URI encodes
 *     encodes it as "%20" (and not as "+").
 *   * URI encodes every byte by prefixing with '%' the two-digit hexadecimal value of the byte.
 *   * If the `path` argument is set, forward slashes are not encoded, to fit with
 *     S3 requirements.
 *
 * N.B: this implementation differs with ES6' mainly in that it does
 * encode the "'" character.
 *
 * Based on AWS implementation: https://github.com/aws/aws-sdk-java/blob/master/aws-java-sdk-core/src/main/java/com/amazonaws/util/SdkHttpUtils.java#L66
 * Encoding specs: https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
 *
 * @param {string} uri - uri to encode
 * @param {boolean} path - slash characters should be encoded everywhere,
 *     but in paths, set to false when encoding a path
 * @return {string} the URI encoded result
 */
export function URIEncode(uri, path) {
    if (uri == '') {
        return uri
    }

    return uri
        .split('') // to be able to map over a string, because... javascript...
        .map((letter) => {
            if (isAlpha(letter) || isNumeric(letter) || '-._~'.includes(letter)) {
                return letter
            }

            // Space should be explicitly encoded to as %20.
            if (letter == ' ') {
                return '%20'
            }

            // If the URI is a path, the forward slash shouldn't
            // be encoded.
            if (letter == '/' && path) {
                return '/'
            }

            return '%' + letter.charCodeAt(0).toString(16).toUpperCase()
        })
        .join('')
}

/**
 * Class holding URI encoding configuration
 */
export class URIEncodingConfig {
    /**
     *
     * @param {boolean} double - should the URI be double encoded?
     * @param {boolean} path - is the URI a path? If so, its forward
     *     slashes won't be URIencoded.
     */
    constructor(double, path) {
        this.double = double
        this.path = path
    }
}

/**
 * Compute the request time value as specified by the ISO8601
 * format: YYYYMMDD'T'HHMMSS'Z'
 *
 * @param  {number} timestamp
 * @return {string}
 */
export function toTime(timestamp) {
    return new Date(timestamp).toISOString().replace(/[:\-]|\.\d{3}/g, '')
}
/**
 * Computethe request date value in the format: YYYMMDD
 *
 * @param  {number} timestamp
 * @return {string}
 */
export function toDate(timestamp) {
    return toTime(timestamp).substring(0, 8)
}
/**
 * Parse a HTTP request URL's querystring into an object
 * containing its `key=value` pairs.
 *
 * @param  {string} qs
 * @return {object}
 */
export function parseQueryString(qs) {
    if (typeof qs !== 'string' || qs.length === 0) {
        return {}
    }

    var result = {}
    var split = qs.split('&').filter((e) => e) // filter drops empty elements

    for (let i = 0; i < split.length; i++) {
        let parts = split[i].split('=')

        if (parts.length === 2) {
            result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1])
        } else {
            result[decodeURIComponent(split[i])] = ''
        }
    }

    return result
}

function isAlpha(c) {
    return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')
}

function isNumeric(c) {
    return c >= '0' && c <= '9'
}

// FIXME: finish implementation when needed
// See the following for more details:
//   * https://docs.aws.amazon.com/general/latest/gr/sigv4-add-signature-to-request.html
//   * https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
// export function signQueryString(
// queryString,
// requestTimestamp,
// accessKeyID,
// secretAccessKey,
// region,
// service,
// ttl, // in seconds
// headers,
// doubleURIEncoding = true
// ) {
// const credential = [accessKeyID, toDate(requestTimestamp), region, service].join('/')
//
// const canonicalRequest = createCanonicalRequest(
// method,
// path,
// queryString,
// headers,
// body,
// doubleURIEncoding
// )
//
// const derivedSigningKey = deriveSigningKey(secretAccessKey, requestTimestamp, region, service)
//
// const stringToSign = createStringToSign(
// requestTimestamp,
// region,
// service,
// sha256(canonicalRequest, 'hex')
// )
//
// const signedHeaders = createSignedHeaders(headers)
// const signature = calculateSignature(derivedSigningKey, stringToSign)
//
// return [
// `X-Amz-Algorithm=${HashingAlgorithm}`,
// `X-Amz-Credential=${crediental}`,
// `X-Amz-Date=${toTime(requestTimestamp)}`,
// `X-Amz-Expires=${ttl}`,
// `X-Amz-SignedHeaders=${signedHeaders}`,
// `X-Amz-Signature=${signature}`,
//`X-Amz-Security-Token=`,  // TODO: optional
// ].join('&')
// }
