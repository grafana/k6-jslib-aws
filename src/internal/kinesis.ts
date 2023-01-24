/**
 * It creates a new KinesisClient object and returns it.
 * @param {T} obj - T - The object that we're checking for the key.
 * @param k - The number of virtual users to simulate.
 */
import { JSONObject } from 'k6'
import http, { RefinedResponse, ResponseType } from 'k6/http'

import { AWSClient } from './client'

import { AWSConfig } from './config'
import { AWSError } from './error'
import { HTTPHeaders } from './http'
import { InvalidSignatureError, SignatureV4 } from './signature'

const hasKey = <T extends object>(obj: T, k: keyof any): k is keyof T =>
    k in obj;




/* This class is a wrapper around the AWS Kinesis client. It provides a method for each Kinesis
operation, and each method returns a promise. */
export class KinesisClient extends AWSClient {

    signature: SignatureV4

    commonHeaders: HTTPHeaders

    serviceVersion: string

    /**
     * A constructor function that creates a new instance of the Kinesis class.
     * @param {AWSConfig} awsConfig - AWSConfig - This is the configuration object that is passed to
     * the constructor.
     * @returns A Proxy object.
     */
    constructor(awsConfig: AWSConfig) {
        super(awsConfig, 'kinesis')

        this.serviceVersion = 'Kinesis_20131202'


        this.signature = new SignatureV4({
            service: this.serviceName,
            region: this.awsConfig.region,
            credentials: {
                accessKeyId: this.awsConfig.accessKeyId,
                secretAccessKey: this.awsConfig.secretAccessKey,
                sessionToken: this.awsConfig.sessionToken,
            },
            uriEscapePath: false,
            applyChecksum: true,
        })


        this.commonHeaders = {
            'Content-Type': 'application/x-amz-json-1.1',
        }

        return new Proxy(this, {
            get: function (client, target) {
                return hasKey(client, target) ? client[target] : function () {
                    return client.RequestOperation.apply(this, [target.toString(), arguments[0]]);
                };
            }
        });
    }


    /**
     * It makes a request to the AWS API.
     * @param {string} target - The name of the API method you want to call.
     * @param {JSONObject} options - JSONObject = {}
     * @returns A RefinedResponse<ResponseType | undefined>
     */
    RequestOperation(target: string,
        options: JSONObject = {}): RefinedResponse<ResponseType | undefined> {

        const signedRequest = this.signature.sign(
            {
                method: 'POST',
                protocol: this.awsConfig.scheme,
                hostname: this.host,
                path: '/',
                headers: {
                    ...this.commonHeaders,
                    ['X-Amz-Target']: `${this.serviceVersion}.${target}`,
                },
                body: JSON.stringify(options),
            },
            {}
        )
        const res = http.request('POST', signedRequest.url, signedRequest.body, {
            headers: signedRequest.headers,
        })

        this._handle_error(target, res)
        
        return res
    }

    /**
     * If the response is an error, throw an error
     * @param {string} operation - The name of the operation that was called.
     * @param response - RefinedResponse<ResponseType | undefined>
     * @returns The response is being returned.
     */
    _handle_error(
        operation: string,
        response: RefinedResponse<ResponseType | undefined>
    ) {
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
            throw new KinesisServiceError(errorMessage, error.__type as string, operation)
        }

        if (errorCode === 1500) {
            throw new KinesisServiceError(
                'An error occured on the server side',
                'InternalServiceError',
                operation
            )
        }
    }
}


/* `KinesisServiceError` is a subclass of `AWSError` that adds an `operation` property */
export class KinesisServiceError extends AWSError {
    operation: string

    /**
     * Constructs a KinesisServiceError
     *
     * @param  {string} message - human readable error message
     * @param  {string} code - A unique short code representing the error that was emitted
     * @param  {string} operation - Name of the failed Operation
     */
    constructor(message: string, code: string, operation: string) {
        super(message, code)
        this.name = 'KinesisServiceError'
        this.operation = operation
    }
}