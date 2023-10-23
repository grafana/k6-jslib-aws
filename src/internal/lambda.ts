import http, { RefinedResponse, ResponseType } from 'k6/http'

import { AWSClient } from './client'
import { AWSConfig } from './config'
import { AWSError } from './error'
import { JSONObject } from './json'
import { InvalidSignatureError, SignatureV4 } from './signature'
import { AMZ_TARGET_HEADER } from './constants'
import { HTTPHeaders, HTTPMethod } from './http'

/**
 * Class allowing to interact with Amazon AWS's Lambda service
 */
export class LambdaClient extends AWSClient {
    method: HTTPMethod

    commonHeaders: HTTPHeaders

    signature: SignatureV4

    constructor(awsConfig: AWSConfig) {
        super(awsConfig, 'lambda')

        this.signature = new SignatureV4({
            service: this.serviceName,
            region: this.awsConfig.region,
            credentials: {
                accessKeyId: this.awsConfig.accessKeyId,
                secretAccessKey: this.awsConfig.secretAccessKey,
                sessionToken: this.awsConfig.sessionToken,
            },
            uriEscapePath: true,
            applyChecksum: false,
        })

        this.method = 'POST'
        this.commonHeaders = {
            'Content-Type': 'application/x-amz-json-1.1',
        }
    }

    /**
     * Invoke an AWS Lambda function
     *
     * @param {InvokeInput} input - The input for the PutEvents operation.
     * @throws {LambdaServiceError}
     * @throws {InvalidSignatureError}
     */
    async invoke(input: InvokeInput) {
        const qualifier = input.Qualifier ? `?Qualifier=${input.Qualifier}` : ''
        const signedRequest = this.signature.sign(
            {
                method: this.method,
                endpoint: this.endpoint,
                path: `/2015-03-31/functions/${input.FunctionName}/invocations${qualifier}`,
                headers: {
                    ...this.commonHeaders,
                    [AMZ_TARGET_HEADER]: `AWSLambda.${input.InvocationType}`,
                    'X-Amz-Invocation-Type': input.InvocationType,
                    'X-Amz-Log-Type': input.LogType || 'None',
                    'X-Amz-Client-Context': input.ClientContext || '',
                },
                body: JSON.stringify(input.Payload ?? ''),
            },
            {}
        )

        const res = await http.asyncRequest(this.method, signedRequest.url, signedRequest.body, {
            headers: signedRequest.headers,
        })
        this._handle_error(LambdaOperation.Invoke, res)

        if(input.InvocationType === 'Event') {
            return
        }

        return res.json()
    }

    _handle_error(
        operation: LambdaOperation,
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
            throw new LambdaServiceError(errorMessage, error.__type as string, operation)
        }

        if (errorCode === 1500) {
            throw new LambdaServiceError(
                'An error occured on the server side',
                'InternalServiceError',
                operation
            )
        }
    }
}

enum LambdaOperation {
    Invoke = 'Invoke',
}


/**
 * Represents the input for an Invoke operation.
 */
interface InvokeInput {
    FunctionName: string
    InvocationType: 'RequestResponse' | 'Event' | 'DryRun'
    LogType?: 'None' | 'Tail'
    ClientContext?: string
    Qualifier?: string
    Payload?: string
}

export class LambdaServiceError extends AWSError {
    operation: LambdaOperation

    /**
     * Constructs a LambdaServiceError
     *
     * @param  {string} message - human readable error message
     * @param  {string} code - A unique short code representing the error that was emitted
     * @param  {string} operation - Name of the failed Operation
     */
    constructor(message: string, code: string, operation: LambdaOperation) {
        super(message, code)
        this.name = 'LambdaServiceError'
        this.operation = operation
    }
}
