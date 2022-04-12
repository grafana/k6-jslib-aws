import http, { head } from 'k6/http'
import { AWSClient } from './client.js'
import { AWSError } from './error.js'
import { InvalidSignatureError, URIEncodingConfig } from './signature.js'
import { v4 as uuidv4 } from './uuid.js'

/**
 * Class allowing to interact with Amazon AWS's SecretsManager service
 */
export class SecretsManagerClient extends AWSClient {
    /**
     * Create a SecretsManagerClient
     * @param  {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
     */
    constructor(awsConfig) {
        const URIencodingConfig = new URIEncodingConfig(true, false)
        super(awsConfig, 'secretsmanager', URIencodingConfig)

        // this.serviceName = 'secretsmanager'

        // All interactions with the Secrets Manager service
        // are made via the GET or POST method.
        this.method = 'POST'

        this.commonHeaders = {
            'Accept-Encoding': 'identity',
            'Content-Type': 'application/x-amz-json-1.1',
        }
    }

    /**
     * Returns a list of all secrets owned by the authenticated sender of the request.
     * To use this operation, you must have the secretsmanager:ListSecrets permission.
     *
     * @return  {Array.<Secret>} secrets - An array of objects describing Secret Manager's secrets
     * @throws  {SecretsManagerServiceError}
     * @throws  {InvalidSignatureError}
     */
    listSecrets() {
        const body = JSON.stringify({})

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        const { url, headers } = super.buildRequest(this.method, this.host, '/', '', body, {
            ...this.commonHeaders,
            'X-Amz-Target': `${this.serviceName}.ListSecrets`,
        })

        const res = http.request(this.method, url, body, { headers: headers })
        this._handle_error('ListSecrets', res)

        return res.json('SecretList').map((s) => Secret.fromJSON(s))
    }

    /**
     * Retrieves a secret from Amazon Sercets Manager
     *
     * @param {string} secretID - The ARN or name of the secret to retrieve.
     * @returns {Secret} - returns the content of the fetched Secret object.
     * @throws {SecretsManagerServiceError}
     * @throws {InvalidSignatureError}
     */
    getSecret(secretID) {
        const body = JSON.stringify({ SecretId: secretID })

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        const { url, headers } = super.buildRequest(this.method, this.host, '/', '', body, {
            ...this.commonHeaders,
            'X-Amz-Target': `${this.serviceName}.GetSecretValue`,
        })

        const res = http.request(this.method, url, body, { headers: headers })
        this._handle_error('GetSecretValue', res)

        return Secret.fromJSON(res.json())
    }

    /**
     * Creates a new secret
     *
     * Note that this method only supports string-based values at the moment.
     *
     * @param  {string} name - The name of the new secret.
     *     The secret name can contain ASCII letters, numbers, and the following characters: /_+=.@
     * @param  {string} secretString - The text data to encrypt and store in this new version of the secret.
     * @param  {string} description - The description of the secret.
     * @param  {string} versionID=null - Version of the secret. This value helps ensure idempotency.
     *     As a default, if no versionID is provided, one will be created for you using the UUID v4
     *     algorithm.
     * @param  {Array.<Object>} tags=[] - A list of tags to attach to the secret. Each tag is a key and
     *     value pair of strings in a JSON text string. Note that tag key names are case sensitive.
     * @returns {Secret} - returns the created secret
     * @throws {SecretsManagerServiceError}
     * @throws {InvalidSignatureError}
     */
    createSecret(name, secretString, description, versionID = null, tags = []) {
        versionID = versionID || uuidv4()

        const body = JSON.stringify({
            Name: name,
            Description: description,
            SecretString: secretString,
            ClientRequestToken: versionID,
            Tags: tags,
        })

        const { url, headers } = super.buildRequest(this.method, this.host, '/', '', body, {
            ...this.commonHeaders,
            'X-Amz-Target': `${this.serviceName}.CreateSecret`,
        })

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        // headers['X-Amz-Target'] = `${this.serviceName}.CreateSecret`

        const res = http.request(this.method, url, body, { headers: headers })
        this._handle_error('CreateSecret', res)

        return Secret.fromJSON(res.json())
    }
    /**
     * Update a secret's value.
     *
     * Note that this method only support string-based values at the moment.
     *
     * @param  {string} secretID - The ARN or name of the secret to update.
     * @param  {string} secretString - The text data to encrypt and store in this new version of the secret.
     * @param  {} versionID=null  - A unique identifier for the new version of the secret. This value helps ensure idempotency.
     *     As a default, if no versionID is provided, one will be created for you using the UUID v4
     * @throws {SecretsManagerServiceError}
     * @throws {InvalidSignatureError}
     */
    putSecretValue(secretID, secretString, versionID = null) {
        versionID = versionID || uuidv4()

        const body = JSON.stringify({
            SecretId: secretID,
            SecretString: secretString,
            ClientRequestToken: versionID,
        })

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        const { url, headers } = super.buildRequest(this.method, this.host, '/', '', body, {
            ...this.commonHeaders,
            'X-Amz-Target': `${this.serviceName}.PutSecretValue`,
        })

        const res = http.request(this.method, url, body, { headers: headers })
        this._handle_error('PutSecretValue', res)

        return Secret.fromJSON(res.json())
    }

    /**
     * Deletes a secret and all of its versions.
     *
     * You can specify a recovery window during which you can restore the secret.
     * The minimum recovery window is 7 days. The default recovery window is 30 days.
     *
     * @param {string} secretID - The ARN or name of the secret to delete.
     * @param {number} recoveryWindow - The number of days from 7 to 30 that Secrets Manager
     *     waits before permanently deleting the secret.
     * @throws {SecretsManagerServiceError}
     * @throws {InvalidSignatureError}
     */
    deleteSecret(secretID, { recoveryWindow = 30, noRecovery = false }) {
        const payload = {
            SecretId: secretID,
        }

        // noRecovery and recoveryWindow are exclusive parameters
        if (noRecovery === true) {
            payload['ForceDeleteWithoutRecovery'] = true
        } else {
            payload['RecoveryWindowInDays'] = recoveryWindow
        }

        const body = JSON.stringify(payload)

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        const { url, headers } = super.buildRequest(this.method, this.host, '/', '', body, {
            ...this.commonHeaders,
            'X-Amz-Target': `${this.serviceName}.DeleteSecret`,
        })

        const res = http.request(this.method, url, body, { headers: headers })
        this._handle_error('DeleteSecret', res)
    }

    get host() {
        return `${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
    }

    _handle_error(operation, response) {
        const errorCode = response.error_code
        if (errorCode === 0) {
            return
        }

        const error = response.json()
        if (errorCode >= 1400 && errorCode <= 1499) {
            // In the event of certain errors, the message is not set.
            // Also, note the inconsistency in casing...
            const errorMessage = error.Message || error.message || error.__type

            // Handle specifically the case of an invalid signature
            if (error.__type === 'InvalidSignatureException') {
                throw new InvalidSignatureError(errorMessage, error.__type)
            }

            // Otherwise throw a standard service error
            throw new SecretsManagerError(errorMessage, error.__type, operation)
        }

        if (errorCode === 1500) {
            throw new SecretsManagerError(
                'An error occured on the server side',
                'InternalServiceError',
                operation
            )
        }
    }
}

/**
 * Class representing a Secret Manager's secret
 */
export class Secret {
    /**
     * Constructs a Secret Manager's Secret
     *
     * @param  {string} name - The friendly name of the secret.
     * @param  {string} arn - The ARN of the secret.
     * @param  {number} createdDate - The date and time that this version of the secret was created.
     * @param  {number} lastAccessedDate - The last date that this secret was accessed. This value is
     *     truncated to midnight of the date and therefore shows only the date, not the time.
     * @param  {number} lastChangedDate - The last date and time that this secret was modified in any way.
     * @param  {Array.<Object>} tags - The list of user-defined tags associated with the secret.
     */
    constructor(
        name,
        arn,
        secretString,
        createdDate,
        lastAccessedDate,
        lastChangedDate,
        tags = []
    ) {
        this.name = name
        this.arn = arn
        this.secretString = secretString
        this.createdDate = createdDate
        this.lastAccessedDate = lastAccessedDate
        this.lastChangedDate = lastChangedDate
        this.tags = tags
    }

    /**
     * Parses and constructs a Secret Manager's Secret from the content
     * of a JSON response returned by the AWS service
     *
     * @param  {Object} json - JSON object as returned and parsed from
     *     the AWS service's API call.
     * @returns {Secret}
     */
    static fromJSON(json) {
        return new Secret(
            json.Name,
            json.ARN,
            json.SecretString,
            json.CreatedDate,
            json.LastAccessedDate,
            json.LastChangeddAt,
            json.Tags
        )
    }
}

// TODO: derive a AWSServiceError to extend instead? (to save kb of code?)
export class SecretsManagerError extends AWSError {
    /**
     * Constructs a SecretsManagerError
     *
     * @param  {string} message - human readable error message
     * @param  {string} code - A unique short code representing the error that was emitted
     * @param  {string} operation - Name of the failed Operation
     */
    constructor(message, code, operation) {
        super(message, code)
        this.name = 'SecretsManagerServiceError'
        this.operation = operation
    }
}
