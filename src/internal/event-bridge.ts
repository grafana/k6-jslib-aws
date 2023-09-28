import http, { RefinedResponse, ResponseType } from 'k6/http'

import { AWSClient } from './client'
import { AWSConfig } from './config'
import { AWSError } from './error'
import { JSONObject } from './json'
import { InvalidSignatureError, SignatureV4 } from './signature'
import { AMZ_TARGET_HEADER } from './constants'
import { HTTPHeaders, HTTPMethod } from './http'

/**
 * Represents an event to be submitted.
 *
 * @typedef {Object} PutEventEntry
 *
 * @property {string} Detail - A valid serialized JSON object. There is no other schema imposed. The JSON object may contain fields and nested sub-objects.
 * @property {string} DetailType - Free-form string, with a maximum of 128 characters, used to decide what fields to expect in the event detail.
 * @property {string} EventBusName - The name or ARN of the event bus to receive the event. Only the rules that are associated with this event bus are used to match the event. If you omit this, the default event bus is used.
 * @property {string[]} Resources - AWS resources, identified by Amazon Resource Name (ARN), which the event primarily concerns. Any number, including zero, may be present.
 * @property {string} Source - The source of the event.
 */
interface PutEventEntry {
    Detail: JSONObject
    DetailType: string
    EventBusName: string
    Resources: [string]
    Source: string
}
    Detail: string

/**
 * Represents the input for a put events operation.
 *
 * @typedef {Object} PutEventsInput
 *
 * @property {string} [EndpointId] - The optional URL subdomain of the endpoint.
 * @property {Partial<PutEventEntry>[]} Entries - An array of entries that defines an event in your system.
 */
interface PutEventsInput {
    EndpointId?: string
    Entries: Partial<PutEventEntry>[]
}

/**
 * Class allowing to interact with Amazon AWS's SecretsManager service
 */
export class EventBridgeClient extends AWSClient {
    method: HTTPMethod

    commonHeaders: HTTPHeaders

    signature: SignatureV4

    constructor(awsConfig: AWSConfig) {
        super(awsConfig, 'events')

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

    _handle_error(
        operation: EventBridgeOperation,
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
            throw new EventBridgeServiceError(errorMessage, error.__type as string, operation)
        }

        if (errorCode === 1500) {
            throw new EventBridgeServiceError(
                'An error occured on the server side',
                'InternalServiceError',
                operation
            )
        }
    }

    async putEvents(input: PutEventsInput) {
        const parsedEvent = {
            ...input,
            Entries: input.Entries.map((entry) => ({
                ...entry,
                Detail: JSON.stringify(entry.Detail),
            })),
        }

        const signedRequest = this.signature.sign(
            {
                method: this.method,
                protocol: this.awsConfig.scheme,
                hostname: this.host,
                path: '/',
                headers: {
                    ...this.commonHeaders,
                    [AMZ_TARGET_HEADER]: `AWSEvents.PutEvents`,
                },
                body: JSON.stringify(parsedEvent),
            },
            {}
        )

        const res = await http.asyncRequest(this.method, signedRequest.url, signedRequest.body, {
            headers: signedRequest.headers,
        })
        this._handle_error(EventBridgeOperation.PutEvents, res)
    }
}

enum EventBridgeOperation {
    PutEvents = 'PutEvents',
}

export class EventBridgeServiceError extends AWSError {
    operation: EventBridgeOperation

    /**
     * Constructs a EventBridgeServiceError
     *
     * @param  {string} message - human readable error message
     * @param  {string} code - A unique short code representing the error that was emitted
     * @param  {string} operation - Name of the failed Operation
     */
    constructor(message: string, code: string, operation: EventBridgeOperation) {
        super(message, code)
        this.name = 'EventBridgeServiceError'
        this.operation = operation
    }
}
