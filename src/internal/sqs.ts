import { AWSClient } from './client'
import { AWSConfig } from './config'
import { InvalidSignatureError, SignatureV4 } from './signature'
import { HTTPHeaders } from './http'
import http, { RefinedResponse, ResponseType } from 'k6/http'
import { AWSError } from './error'
import { AMZ_TARGET_HEADER } from './constants'
import { JSONObject } from './json'

export class SQSClient extends AWSClient {
    private readonly signature: SignatureV4
    private readonly commonHeaders: HTTPHeaders

    private readonly serviceVersion: string

    constructor(awsConfig: AWSConfig) {
        super(awsConfig, 'sqs')

        this.serviceVersion = 'AmazonSQS'

        this.signature = new SignatureV4({
            service: this.serviceName,
            region: this.awsConfig.region,
            credentials: {
                accessKeyId: this.awsConfig.accessKeyId,
                secretAccessKey: this.awsConfig.secretAccessKey,
                sessionToken: this.awsConfig.sessionToken,
            },
            uriEscapePath: true,
            applyChecksum: true,
        })

        this.commonHeaders = {
            'Content-Type': 'application/x-amz-json-1.0',
        }
    }

    /**
     * Delivers a message to the specified queue.
     *
     * @param {string} queueUrl - The URL of the Amazon SQS queue to which a message is sent. Queue URLs and names are case-sensitive.
     * @param {string} messageBody - The message to send. The minimum size is one character. The maximum size is 256 KB.
     * @param {Object} options - Options for the request
     * @param {string} [options.messageDeduplicationId] - The message deduplication id.
     * @param {string} [options.messageGroupId] - The message group ID for FIFO queues
     * @returns {MessageResponse} - The message that was sent.
     */
    async sendMessage(
        queueUrl: string,
        messageBody: string,
        options: SendMessageOptions = {}
    ): Promise<MessageResponse> {
        const action = 'SendMessage'

        const body = {
            QueueUrl: queueUrl,
            ...this._combineQueueMessageBodyAndOptions(messageBody, options),
        }

        const res = await this._sendRequest(action, body)

        const parsed = res.json() as JSONObject
        return new MessageResponse(
            parsed['MessageId'] as string,
            parsed['MD5OfMessageBody'] as string
        )
    }

    /**
     * Delivers up to ten messages to the specified queue.
     *
     * @param {string} queueUrl - The URL of the Amazon SQS queue to which a message is sent. Queue URLs and names are case-sensitive.
     * @param {SendMessageBatchEntry[]} entries - A list of up to ten messages to send.
     * @returns {MessageBatchResponse} - The messages that were sent.
     */
    async sendMessageBatch(
        queueUrl: string,
        entries: SendMessageBatchEntry[]
    ): Promise<MessageBatchResponse> {
        const action = 'SendMessageBatch'

        const requestMessageEntries = entries.map((entry) => {
            let requestMessageEntry = this._combineQueueMessageBodyAndOptions(
                entry.messageBody,
                entry.messageOptions
            )
            requestMessageEntry = { ...requestMessageEntry, Id: entry.messageId }
            return requestMessageEntry
        })

        const body = { QueueUrl: queueUrl, Entries: requestMessageEntries }

        const res = await this._sendRequest(action, body)

        const parsed = res.json() as JSONObject
        const successful: JSONObject[] = (parsed['Successful'] as JSONObject[]) || []
        const failed: JSONObject[] = (parsed['Failed'] as JSONObject[]) || []

        return {
            successful: successful.map(
                (entry) =>
                    new MessageResponse(
                        entry['MessageId'] as string,
                        entry['MD5OfMessageBody'] as string
                    )
            ),
            failed: failed.map(
                (entry) =>
                    new SQSServiceError(entry['Message'] as string, entry['Code'] as string, action)
            ),
        }
    }

    /**
     * Returns a list of your queues in the current region.
     *
     * @param {ListQueuesRequestParameters} [parameters={}] request parameters
     * @param {number} [ListQueuesRequestParameters.maxResults] Maximum number of results to include in the response. Value range is 1 to 1000. You must set maxResults to receive a value for nextToken in the response.
     * @param {string} [ListQueuesRequestParameters.nextToken] Pagination token to request the next set of results.
     * @param {string} [ListQueuesRequestParameters.queueNamePrefix] A string to use for filtering the list results. Only those queues whose name begins with the specified string are returned.
     * @returns {Object}
     * @returns {string[]} Object.queueUrls - A list of queue URLs, up to 1000 entries.
     * @returns {string} [Object.nextToken] - In the future, you can use NextToken to request the next set of results.
     */
    async listQueues(parameters: ListQueuesRequestParameters = {}): Promise<ListQueuesResponse> {
        const action = 'ListQueues'

        let body: object = {}

        if (typeof parameters?.maxResults !== 'undefined') {
            body = { ...body, MaxResults: parameters.maxResults }
        }

        if (typeof parameters?.nextToken !== 'undefined') {
            body = { ...body, NextToken: parameters.nextToken }
        }

        if (typeof parameters?.queueNamePrefix !== 'undefined') {
            body = { ...body, QueueNamePrefix: parameters.queueNamePrefix }
        }

        const res = await this._sendRequest(action, body)

        const parsed = res.json() as JSONObject
        return {
            urls: parsed['QueueUrls'] as string[],
            nextToken: parsed?.NextToken as string,
        }
    }

    private _combineQueueMessageBodyAndOptions(
        messageBody: string,
        options?: SendMessageOptions
    ): object {
        let body: object = { MessageBody: messageBody }

        if (options === undefined) {
            return body
        }

        if (typeof options.messageDeduplicationId !== 'undefined') {
            body = { ...body, MessageDeduplicationId: options.messageDeduplicationId }
        }

        if (typeof options.messageGroupId !== 'undefined') {
            body = { ...body, MessageGroupId: options.messageGroupId }
        }

        if (typeof options.messageAttributes !== 'undefined') {
            const messageAttributes: Record<string, Record<string, string>> = {}

            for (const [name, attribute] of Object.entries(options.messageAttributes)) {
                const valueParameterSuffix =
                    attribute.type === 'Binary' ? 'BinaryValue' : 'StringValue'
                messageAttributes[name] = {
                    DataType: attribute.type,
                }
                messageAttributes[name][valueParameterSuffix] = attribute.value
            }

            body = { ...body, MessageAttributes: messageAttributes }
        }

        if (typeof options.delaySeconds !== 'undefined') {
            body = { ...body, DelaySeconds: options.delaySeconds }
        }

        return body
    }

    private async _sendRequest(
        action: SQSOperation,
        body: object
    ): Promise<RefinedResponse<ResponseType>> {
        const signedRequest = this.signature.sign(
            {
                method: 'POST',
                endpoint: this.endpoint,
                path: '/',
                headers: {
                    ...this.commonHeaders,
                    [AMZ_TARGET_HEADER]: `${this.serviceVersion}.${action}`,
                },
                body: JSON.stringify(body),
            },
            {}
        )

        const res = await http.asyncRequest('POST', signedRequest.url, signedRequest.body, {
            headers: signedRequest.headers,
        })

        this._handleError(action, res)
        return res
    }

    private _handleError(
        operation: SQSOperation,
        response: RefinedResponse<ResponseType | undefined>
    ) {
        const errorCode: number = response.error_code

        if (errorCode === 0) {
            return
        }

        const error = response.json() as JSONObject

        const errorMessage: string =
            (error.Message as string) || (error.message as string) || (error.__type as string)

        switch (error.__type) {
            case 'InvalidSignatureException':
                throw new InvalidSignatureError(errorMessage, error.__type)
            default:
                throw new SQSServiceError(errorMessage, error.__type as string, operation)
        }
    }
}

/**
 * An Amazon SQS message.
 */
export class MessageResponse {
    /**
     * A unique identifier for the message.
     * A MessageIdis considered unique across all AWS accounts for an extended period of time.
     */
    id: string

    /**
     * An MD5 digest of the non-URL-encoded message body string.
     */
    bodyMD5: string

    /**
     * Instantiates a new Message object.
     *
     * @param id
     * @param md5Ofbody
     */
    constructor(id: string, bodyMD5: string) {
        this.id = id
        this.bodyMD5 = bodyMD5
    }
}

/**
 * An Amazon SQS message Batch Response.
 */
export class MessageBatchResponse {
    /**
     * A list of successful messages.
     */
    successful: MessageResponse[]

    /**
     * A list of failed messages.
     */
    failed: SQSServiceError[]

    /**
     * Instantiates a new MessageBatchResponse object.
     *
     * @param successful
     * @param failed
     */
    constructor(successful: MessageResponse[], failed: SQSServiceError[]) {
        this.successful = successful
        this.failed = failed
    }
}

/**
 * SQSServiceError indicates an error occurred while interacting with the SQS API.
 */
export class SQSServiceError extends AWSError {
    operation: SQSOperation

    constructor(message: string, code: string, operation: SQSOperation) {
        super(message, code)
        this.name = 'SQSServiceError'
        this.operation = operation
    }
}

/**
 * SQSOperation describes possible SQS operations.
 */
type SQSOperation = 'ListQueues' | 'SendMessage' | 'SendMessageBatch'

export interface SendMessageOptions {
    /**
     * The message deduplication ID for FIFO queues
     */
    messageDeduplicationId?: string

    /**
     * The message group ID for FIFO queues
     */
    messageGroupId?: string

    /**
     * The message attributes
     */
    messageAttributes?: {
        [name: string]: { type: 'String' | 'Number' | 'Binary'; value: string }
    }

    /**
     * The length of time, in seconds, for which to delay a specific message.
     */
    delaySeconds?: number
}

export interface SendMessageBatchEntry {
    messageId: string
    messageBody: string
    messageOptions?: SendMessageOptions
}

export interface ListQueuesRequestParameters {
    /**
     * Maximum number of results to include in the response. Value range is 1 to 1000.
     */
    maxResults?: number
    /**
     * Pagination token to request the next set of results.
     */
    nextToken?: string
    /**
     * A string to use for filtering the list results. Only those queues whose name begins with the specified string are returned.
     * Queue URLs and names are case-sensitive.
     */
    queueNamePrefix?: string
}

export interface ListQueuesResponse {
    /**
     * A list of queue URLs, up to 1,000 entries, or the value of MaxResults you sent in the request.
     */
    urls: string[]
    /**
     * Pagination token to include in the next request.
     */
    nextToken?: string
}
