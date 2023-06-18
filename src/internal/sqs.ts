import { AWSClient } from './client'
import { AWSConfig } from './config'
import { SignatureV4, InvalidSignatureError } from './signature'
import { HTTPHeaders, SignedHTTPRequest } from './http'
import http, { RefinedResponse, ResponseType } from 'k6/http'
import { toFormUrlEncoded } from './utils'
import { AWSError } from './error'

const API_VERSION = '2012-11-05'

export class SQSClient extends AWSClient {
    private readonly signature: SignatureV4
    private readonly commonHeaders: HTTPHeaders

    constructor(awsConfig: AWSConfig) {
        super(awsConfig, 'sqs')

        this.signature = new SignatureV4({
            service: this.serviceName,
            region: this.awsConfig.region,
            credentials: {
                accessKeyId: this.awsConfig.accessKeyId,
                secretAccessKey: this.awsConfig.secretAccessKey,
                sessionToken: this.awsConfig.sessionToken
            },
            uriEscapePath: true,
            applyChecksum: true
        })

        this.commonHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
     * @returns {Message} - The message that was sent.
     */
    sendMessage(queueUrl: string, messageBody: string, options: { messageDeduplicationId?: string; messageGroupId?: string} = {}): Message {
        const method = 'POST'

        let body: any = {
            Action: 'SendMessage',
            Version: API_VERSION,
            QueueUrl: queueUrl,
            MessageBody: messageBody,
        }

        if (typeof(options.messageDeduplicationId) !== 'undefined') {
            body = { ...body,
                MessageDeduplicationId: options.messageDeduplicationId
            }
        }

        if (typeof(options.messageGroupId) !== 'undefined') {
            body = { ...body,
                MessageGroupId: options.messageGroupId
            }
        }

        const signedRequest: SignedHTTPRequest = this.signature.sign(
            {
                method: 'POST',
                protocol: this.scheme,
                hostname: this.host,
                path: '/',
                headers: {
                    ...this.commonHeaders
                },
                body: toFormUrlEncoded(body)
            },
            {}
        )

        const res = http.request(method, signedRequest.url, signedRequest.body || '', {
            headers: signedRequest.headers
        })
        this._handleError('SendMessage', res)

        const parsed = res.html('SendMessageResponse > SendMessageResult')
        return new Message(
            parsed.find('MessageId').text(),
            parsed.find('MD5OfMessageBody').text()
        )
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
    listQueues(parameters: ListQueuesRequestParameters = {}): ListQueuesResponse {
        const method = 'POST'

        let body: any = {
            Action: 'ListQueues',
            Version: API_VERSION,
        }

        if (typeof(parameters?.maxResults) !== 'undefined') {
            body = { ...body,
                MaxResults: parameters.maxResults
            }
        }

        if (typeof(parameters?.nextToken) !== 'undefined') {
            body = { ...body,
                NextToken: parameters.nextToken
            }
        }

        if (typeof(parameters?.queueNamePrefix) !== 'undefined') {
            body = { ...body,
                QueueNamePrefix: parameters.queueNamePrefix
            }
        }

        const signedRequest: SignedHTTPRequest = this.signature.sign(
            {
                method: 'POST',
                protocol: this.scheme,
                hostname: this.host,
                path: '/',
                headers: {
                    ...this.commonHeaders,
                    'Host': this.host
                },
                body: toFormUrlEncoded(body)
            },
            {}
        )

        const res = http.request(method, signedRequest.url, signedRequest.body || '', {
            headers: signedRequest.headers
        })
        this._handleError('ListQueues', res)

        let parsed = res.html()
        return {
            urls: parsed.find('QueueUrl').toArray().map(e => e.text()),
            nextToken: parsed.find('NextToken').text() || undefined
        }
    }

    private _handleError(operation: SQSOperation, response: RefinedResponse<ResponseType | undefined>) {
        const errorCode: number = response.error_code
        const errorMessage: string = response.error

        if (errorMessage == '' && errorCode === 0) {
            return
        }

        const awsError = AWSError.parseXML(response.body as string)
        switch (awsError.code) {
            case 'AuthorizationHeaderMalformed':
                throw new InvalidSignatureError(awsError.message, awsError.code)
            default:
                throw new SQSServiceError(awsError.message, awsError.code || 'unknown', operation)
        }
    }
}

/**
 * An Amazon SQS message.
 */
export class Message {
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
 * SQSServiceError indicates an error occurred while interacting with the SQS API.
 */
export class SQSServiceError extends AWSError {
    operation: SQSOperation;

    constructor(message: string, code: string, operation: SQSOperation) {
        super(message, code)
        this.name = 'SQSServiceError'
        this.operation = operation
    }
}

/**
 * SQSOperation describes possible SQS operations.
 */
type SQSOperation = 'ListQueues' | 'SendMessage'

export interface SendMessageOptions {
    /*
     * The message deduplication ID for FIFO queues
    */
    messageDeduplicationId?: string

    /*
     * The message group ID for FIFO queues
     */
    messageGroupId?: string
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
