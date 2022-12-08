import { HTTPScheme } from './http'

/** Class holding an AWS connection information */
export class AWSConfig {
    /**
     * The AWS region to connect to, as listed: https://docs.aws.amazon.com/general/latest/gr/rande.html
     *
     * @type {string}
     */
    region: string

    /**
     * Your user's AWS access key id credential.
     *
     * @type {string}
     */
    accessKeyId: string

    /**
     * Your user's AWS secret access key credential.
     *
     * @type {string}
     */
    secretAccessKey: string

    /**
     * Your user's AWS session token credential.
     *
     * @type {string}
     */
    sessionToken?: string

    /**
     * The HTTP scheme to use when connecting to AWS.
     *
     * @type {HTTPScheme} ['https']
     */
    scheme: HTTPScheme = 'https'

    // FIXME: Should really be called "host" instead. When used
    // with localstack we pass a complete host (hostname:port) here.
    /**
     * The AWS hostname to connect to.
     *
     * @type {string} ['amazonaws.com']
     */
    endpoint: string = 'amazonaws.com'

    /**
     * RGW compatible.
     *
     * @type {boolean}
     */
    rgw: boolean = false

    /**
     * Create an AWSConfig.
     *
     * @param {AWSConfigOptions} options - configuration attributes to use when interacting with AWS' APIs
     * @throws {InvalidArgumentException}
     */
    constructor(options: AWSConfigOptions) {
        if (options.region === '') {
            throw new InvalidAWSConfigError(
                'invalid AWS region; reason: should be a non empty string'
            )
        }

        if (options.accessKeyId === '') {
            throw new InvalidAWSConfigError(
                'invalid AWS access key ID; reason: should be a non empty string'
            )
        }

        if (options.accessKeyId.length < 16 || options.accessKeyId.length > 128) {
            throw new InvalidAWSConfigError(
                `invalid AWS access key ID; reason: size should be between 16 and 128 characters, got ${options.accessKeyId.length}`
            )
        }

        if (options.secretAccessKey === '') {
            throw new InvalidAWSConfigError(
                'invalid AWS secret access key; reason: should be a non empty string'
            )
        }

        if (options.secretAccessKey.length < 16 || options.secretAccessKey.length > 128) {
            throw new InvalidAWSConfigError(
                `invalid AWS secret access key; reason: size should be between 16 and 128 characters, got ${options.secretAccessKey.length}`
            )
        }

        this.region = options.region
        this.accessKeyId = options.accessKeyId
        this.secretAccessKey = options.secretAccessKey

        if (options.sessionToken !== undefined) {
            this.sessionToken = options.sessionToken
        }

        if (options.scheme !== undefined) {
            this.scheme = options.scheme
        }

        if (options.endpoint !== undefined) {
            this.endpoint = options.endpoint
        }

        if (options.rgw !== undefined) {
            this.rgw = options.rgw
        }
    }
}

/**
 * Interface representing AWSConfig options
 */
export interface AWSConfigOptions {
    /**
     * The AWS region to connect to, as listed: https://docs.aws.amazon.com/general/latest/gr/rande.html
     *
     * @type {string}
     */
    region: string

    /**
     * Your user's AWS access key id credential.
     *
     * @type {string}
     */
    accessKeyId: string

    /**
     * Your user's AWS secret access key credential.
     *
     * @type {string}
     */
    secretAccessKey: string

    /**
     * Your user's AWS session token credential.
     *
     * @type {string}
     */
    sessionToken?: string

    /**
     * The HTTP scheme to use when connecting to AWS.
     *
     * @type {HTTPScheme}
     */
    scheme?: HTTPScheme

    /**
     * The AWS hostname to connect to.
     *
     * @type {string}
     */
    endpoint?: string

    /**
     * RGW compatible.
     *
     * @type {boolean}
     */
    rgw?: booleaan
}

/** Class representing an invalid AWS configuration */
export class InvalidAWSConfigError extends Error {
    constructor(message: string) {
        super(message)
    }
}
