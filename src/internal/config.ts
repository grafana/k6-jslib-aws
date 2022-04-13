/** Class holding an AWS connection information */
export class AWSConfig {
    region: string
    accessKeyID: string
    secretAccessKey: string

    /**
     * Create an AWSConfig.
     *
     * @param {string} region - the AWS region to connect to, as listed: https://docs.aws.amazon.com/general/latest/gr/rande.html
     * @param {string} accessKeyID - Your user's AWS access key id credential
     * @param {string} secretAccessKey - Your user's AWS secret access key credential
     * @throws {InvalidArgumentException}
     */
    constructor(region: string, accessKeyID: string, secretAccessKey: string) {
        if (typeof region !== 'string' || region === '') {
            throw new InvalidAWSConfigError(
                'invalid AWS region; reason: should be a non empty string'
            )
        }

        if (typeof accessKeyID !== 'string' || accessKeyID === '') {
            throw new InvalidAWSConfigError(
                'invalid AWS access key ID; reason: should be a non empty string'
            )
        }

        if (typeof secretAccessKey !== 'string' || secretAccessKey === '') {
            throw new InvalidAWSConfigError(
                'invalid AWS secret access key; reason: should be a non empty string'
            )
        }

        this.region = region
        this.accessKeyID = accessKeyID
        this.secretAccessKey = secretAccessKey
    }
}

/** Class representing an invalid AWS configuration */
export class InvalidAWSConfigError extends Error {
    constructor(message: string) {
        super(message)
    }
}
