import { JSONObject } from './json'
import { parseHTML } from 'k6/html'
import { Response } from 'k6/http'

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
    code?: string

    /**
     * Create an AWSError
     *
     * @param {string} message - A longer human readable error message.
     * @param {string?} code - A unique short code representing the error that was emitted
     */
    constructor(message: string, code?: string) {
        super(message)
        this.name = 'AWSError'
        this.code = code
    }

    /**
     * Parse an AWSError from an XML document
     *
     * @param  {string} xmlDocument - Serialized XML document to parse the error from
     */
    static parseXML(xmlDocument: string): AWSError {
        const doc = parseHTML(xmlDocument)
        return new AWSError(doc.find('Message').text(), doc.find('Code').text())
    }

    static parse(response: Response): AWSError {
        if (response.headers['Content-Type'] === 'application/json') {
            const error = (response.json() as JSONObject) || {}
            const message =
                error.Message ||
                error.message ||
                error.__type ||
                'An error occurred on the server side'
            const code = response.headers['X-Amzn-Errortype'] || error.__type
            return new AWSError(message as string, code as string)
        } else {
            return AWSError.parseXML(response.body as string)
        }
    }
}

export class NetworkError<N extends NetworkErrorName, K extends ErrorKind> extends Error {
    code: K;
    name: N;

    constructor(name: N, code: K) {
        super(ErrorMessages[code] || 'An unknown error occurred')
        this.name = name
        this.code = code
    }
}

export class GeneralError extends NetworkError<'GeneralError', GeneralErrorKind> {
    constructor(code: GeneralErrorKind) {
        super('GeneralError', code)
    }
}

export class DNSError extends NetworkError<'DNSError', DNSErrorKind> {
    constructor(code: DNSErrorKind) {
        super('DNSError', code)
    }
}

export class TCPError extends NetworkError<'TCPError', TCPErrorKind> {
    constructor(code: TCPErrorKind) {
        super('TCPError', code)
    }
}

export class TLSError extends NetworkError<'TLSError', TLSErrorKind> {
    constructor(code: TLSErrorKind) {
        super('TLSError', code)
    }
}

export class HTTP2Error extends NetworkError<'HTTP2Error', HTTP2ErrorKind> {
    constructor(code: HTTP2ErrorKind) {
        super('HTTP2Error', code)
    }
}


type NetworkErrorName = 'GeneralError' | 'DNSError' | 'TCPError' | 'TLSError' | 'HTTP2Error'

type ErrorKind =
    GeneralErrorKind |
    DNSErrorKind |
    TCPErrorKind |
    TLSErrorKind |
    HTTP2ErrorKind

export enum GeneralErrorKind {
    GenericError = 1000,
    NonTCPNetworkError = 1010,
    InvalidURL = 1020,
    HTTPRequestTimeout = 1050,
}

export enum DNSErrorKind {
    GenericDNSError = 1100,
    NoIPFound = 1101,
    BlacklistedIP = 1110,
    BlacklistedHostname = 1111,
}

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

export enum TLSErrorKind {
    GeneralTLSError = 1300,
    UnknownAuthority = 1310,
    CertificateHostnameMismatch = 1311,
}

export enum HTTP2ErrorKind {
    GenericHTTP2Error = 1600,
    GeneralHTTP2GoAwayError = 1610,
}

const ErrorMessages: { [key in ErrorKind]: string } = {
    [GeneralErrorKind.GenericError]: 'A generic error that isn’t any of the ones listed below',
    [GeneralErrorKind.NonTCPNetworkError]: 'A non-TCP network error - this is a placeholder and there is no error currently known to trigger it',
    [GeneralErrorKind.InvalidURL]: 'An invalid URL was specified',
    [GeneralErrorKind.HTTPRequestTimeout]: 'The HTTP request has timed out',
    [DNSErrorKind.GenericDNSError]: 'A generic DNS error that isn’t any of the ones listed below',
    [DNSErrorKind.NoIPFound]: 'No IP for the provided host was found',
    [DNSErrorKind.BlacklistedIP]: 'Blacklisted IP was resolved or a connection to such was tried to be established',
    [DNSErrorKind.BlacklistedHostname]: 'Blacklisted hostname using The Block Hostnames option',
    [TCPErrorKind.GenericTCPError]: 'A generic TCP error that isn’t any of the ones listed below',
    [TCPErrorKind.BrokenPipeOnWrite]: 'A “broken pipe” on write - the other side has likely closed the connection',
    [TCPErrorKind.UnknownTCPError]: 'An unknown TCP error - We got an error that we don’t recognize but it is from the operating system and has errno set on it. The message in error includes the operation(write,read) and the errno, the OS, and the original message of the error',
    [TCPErrorKind.GeneralTCPDialError]: 'General TCP dial error',
    [TCPErrorKind.DialTimeoutError]: 'Dial timeout error - the timeout for the dial was reached',
    [TCPErrorKind.DialConnectionRefused]: 'Dial connection refused - the connection was refused by the other party on dial',
    [TCPErrorKind.DialUnknownError]: 'Dial unknown error',
    [TCPErrorKind.ResetByPeer]: 'Reset by peer - the connection was reset by the other party, most likely a server',
    [TLSErrorKind.GeneralTLSError]: 'General TLS error',
    [TLSErrorKind.UnknownAuthority]: 'Unknown authority - the certificate issuer is unknown',
    [TLSErrorKind.CertificateHostnameMismatch]: 'The certificate doesn’t match the hostname',
    [HTTP2ErrorKind.GenericHTTP2Error]: 'A generic HTTP/2 error that isn’t any of the ones listed below',
    [HTTP2ErrorKind.GeneralHTTP2GoAwayError]: 'A general HTTP/2 GoAway error',
};