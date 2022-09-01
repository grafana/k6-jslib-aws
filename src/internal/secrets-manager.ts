import { JSONArray, JSONObject } from 'k6'
import http, { RefinedResponse, ResponseType } from 'k6/http'

import { AWSClient, AWSRequest } from './client'
import { AWSError } from './error'
import { AWSConfig } from './config'
import { InvalidSignatureError, URIEncodingConfig } from './signature'
import { v4 as uuidv4 } from 'uuid'
import { HTTPMethod, HTTPHeaders } from './http'

/**
 * Class allowing to interact with Amazon AWS's SecretsManager service
 */
export class SecretsManagerClient extends AWSClient {
    /**
     * HTTP Method to use when interacting with the Secrets Manager service.
     */
    method: HTTPMethod

    /**
     * HTTP Host to use when interacting with the Secrets Manager service.
     */
    host: string

    /**
     * HTTP headers to use accross all requests to the Secrets Manager service.
     */
    commonHeaders: HTTPHeaders

    /**
     * Create a SecretsManagerClient
     * @param  {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
     */
    constructor(awsConfig: AWSConfig) {
        const URIencodingConfig = new URIEncodingConfig(true, false)
        super(awsConfig, 'secretsmanager', URIencodingConfig)

        // All interactions with the Secrets Manager service
        // are made via the GET or POST method.
        this.method = 'POST'
        this.host = `${this.serviceName}.${this.awsConfig.region}.${this.awsConfig.endpoint}`
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
    listSecrets(): Array<Secret> {
        const body = JSON.stringify({})

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        const signedRequest: AWSRequest = super.buildRequest(
            this.method,
            this.host,
            '/',
            '',
            body,
            {
                ...this.commonHeaders,
                'X-Amz-Target': `${this.serviceName}.ListSecrets`,
            }
        )

        const res = http.request(this.method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error('ListSecrets', res)
        const json: JSONArray = res.json('SecretList') as JSONArray

        return json.map((s) => Secret.fromJSON(s as JSONObject))
    }

    /**
     * Retrieves a secret from Amazon Sercets Manager
     *
     * @param {string} id - The ARN or name of the secret to retrieve.
     * @returns {Secret} - returns the content of the fetched Secret object.
     * @throws {SecretsManagerServiceError}
     * @throws {InvalidSignatureError}
     */
    getSecret(id: string): Secret | undefined {
        const body = JSON.stringify({ SecretId: id })

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        const signedRequest: AWSRequest = super.buildRequest(
            this.method,
            this.host,
            '/',
            '',
            body,
            {
                ...this.commonHeaders,
                'X-Amz-Target': `${this.serviceName}.GetSecretValue`,
            }
        )

        const res = http.request(this.method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error('GetSecretValue', res)

        return Secret.fromJSON(res.json() as JSONObject)
    }

    /**
     * Creates a new secret
     *
     * Note that this method only supports string-based values at the moment.
     *
     * @param  {string} name - The name of the new secret.
     *     The secret name can contain ASCII letters, numbers, and the following characters: /_+=.@
     * @param  {string} secret - The text data to encrypt and store in this new version of the secret.
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
    createSecret(
        name: string,
        secret: string,
        description: string,
        versionID?: string,
        tags?: Array<Object>
    ): Secret {
        versionID = versionID || uuidv4()

        const body = JSON.stringify({
            Name: name,
            Description: description,
            SecretString: secret,
            ClientRequestToken: versionID,
            Tags: tags,
        })

        const signedRequest: AWSRequest = super.buildRequest(
            this.method,
            this.host,
            '/',
            '',
            body,
            {
                ...this.commonHeaders,
                'X-Amz-Target': `${this.serviceName}.CreateSecret`,
            }
        )

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        // headers['X-Amz-Target'] = `${this.serviceName}.CreateSecret`

        const res = http.request(this.method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error('CreateSecret', res)

        return Secret.fromJSON(res.json() as JSONObject)
    }
    /**
     * Update a secret's value.
     *
     * Note that this method only support string-based values at the moment.
     *
     * @param  {string} id - The ARN or name of the secret to update.
     * @param  {string} secret - The text data to encrypt and store in this new version of the secret.
     * @param  {} versionID=null  - A unique identifier for the new version of the secret. This value helps ensure idempotency.
     *     As a default, if no versionID is provided, one will be created for you using the UUID v4
     * @throws {SecretsManagerServiceError}
     * @throws {InvalidSignatureError}
     */
    putSecretValue(id: string, secret: string, versionID?: string): Secret {
        versionID = versionID || uuidv4()

        const body = JSON.stringify({
            SecretId: id,
            SecretString: secret,
            ClientRequestToken: versionID,
        })

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        const signedRequest: AWSRequest = super.buildRequest(
            this.method,
            this.host,
            '/',
            '',
            body,
            {
                ...this.commonHeaders,
                'X-Amz-Target': `${this.serviceName}.PutSecretValue`,
            }
        )

        const res = http.request(this.method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error('PutSecretValue', res)

        return Secret.fromJSON(res.json() as JSONObject)
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
    deleteSecret(
        id: string,
        { recoveryWindow = 30, noRecovery = false }: { recoveryWindow: number; noRecovery: boolean }
    ) {
        const payload: { [key: string]: string | boolean | number } = {
            SecretId: id,
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
        const signedRequest: AWSRequest = super.buildRequest(
            this.method,
            this.host,
            '/',
            '',
            body,
            {
                ...this.commonHeaders,
                'X-Amz-Target': `${this.serviceName}.DeleteSecret`,
            }
        )

        const res = http.request(this.method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error('DeleteSecret', res)
    }

    // TODO: operation should be an enum
    _handle_error(operation: string, response: RefinedResponse<ResponseType | undefined>) {
        const errorCode = response.error_code
        if (errorCode === 0) {
            return
        }

        const error = response.json() as JSONObject
        if (errorCode >= 1400 && errorCode <= 1499) {
            // In the event of certain errors, the message is not set.
            // Also, note the inconsistency in casing...
            const errorMessage: string =
                (error.Message as string) || (error.message as string) || (error.__type as string)

            // Handle specifically the case of an invalid signature
            if (error.__type === 'InvalidSignatureException') {
                throw new InvalidSignatureError(errorMessage, error.__type)
            }

            // Otherwise throw a standard service error
            throw new SecretsManagerServiceError(errorMessage, error.__type as string, operation)
        }

        if (errorCode === 1500) {
            throw new SecretsManagerServiceError(
                'An error occured on the server side',
                'InternalServiceError',
                operation
            )
        }
    }
}

// TODO: create a Tags type

/**
 * Class representing a Secret Manager's secret
 */
export class Secret {
    name: string
    arn: string
    secret: string
    createdDate: number
    lastAccessedDate: number
    lastChangedDate: number
    tags: Array<{ [key: string]: string }>

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
        name: string,
        arn: string,
        secretString: string,
        createdDate: number,
        lastAccessedDate: number,
        lastChangedDate: number,
        tags: Array<{ [key: string]: string }> = []
    ) {
        this.name = name
        this.arn = arn
        this.secret = secretString
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
    static fromJSON(json: JSONObject) {
        return new Secret(
            json.Name as string,
            json.ARN as string,
            json.SecretString as string,
            json.CreatedDate as number,
            json.LastAccessedDate as number,
            json.LastChangedDate as number,
            json.Tags as Array<{ [key: string]: string }>
        )
    }
}

export class SecretsManagerServiceError extends AWSError {
    operation: string

    /**
     * Constructs a SecretsManagerServiceError
     *
     * @param  {string} message - human readable error message
     * @param  {string} code - A unique short code representing the error that was emitted
     * @param  {string} operation - Name of the failed Operation
     */
    constructor(message: string, code: string, operation: string) {
        super(message, code)
        this.name = 'SecretsManagerServiceError'
        this.operation = operation
    }
}
