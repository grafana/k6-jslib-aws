import { AWSClient } from './client'
import { AWSConfig } from './config'
import { SignatureV4 } from './signature'
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
            uriEscapePath: false,
            applyChecksum: true
        })

        this.commonHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }

    sendMessage(request: SendMessageRequestParameters): SendMessageResponse {
        const method = 'POST'
        const signedRequest: SignedHTTPRequest = this.signature.sign(
            {
                method: 'POST',
                protocol: 'https',
                hostname: this.host,
                path: '/',
                headers: {
                    ...this.commonHeaders
                },
                body: toFormUrlEncoded(this._buildBody({
                    Action: 'SendMessage',
                    Version: API_VERSION,
                    QueueUrl: request.queueUrl,
                    MessageBody: request.messageBody,
                }, request))
            },
            {}
        )

        const res = http.request(method, signedRequest.url, signedRequest.body || '', {
            headers: signedRequest.headers
        })
        this._handleError(res)

        const parsed = res.html('SendMessageResponse > SendMessageResult')
        return {
            messageId: parsed.find('MessageId').text(),
            md5OfMessageBody: parsed.find('MD5OfMessageBody').text()
        }
    }

    listQueues(request: ListQueuesRequestParameters = {}): ListQueuesResponse {
        const method = 'POST'
        const signedRequest: SignedHTTPRequest = this.signature.sign(
            {
                method: 'POST',
                protocol: 'https',
                hostname: this.host,
                path: '/',
                headers: {
                    ...this.commonHeaders,
                    'Host': this.host
                },
                body: toFormUrlEncoded({
                    Action: 'ListQueues',
                    Version: API_VERSION,
                    MaxResults: request.maxResults,
                    NextToken: request.nextToken,
                    QueueNamePrefix: request.queueNamePrefix
                })
            },
            {}
        )

        const res = http.request(method, signedRequest.url, signedRequest.body || '', {
            headers: signedRequest.headers
        })
        this._handleError(res)

        let parsed = res.html()
        return {
            queueUrls: parsed.find('QueueUrl').toArray().map(e => e.text()),
            nextToken: parsed.find('NextToken').text() || undefined
        }
    }

    private _handleError(response: RefinedResponse<ResponseType | undefined>) {
        const errorCode: number = response.error_code
        const errorMessage: string = response.error

        if (errorMessage == '' && errorCode === 0) {
            return
        }

        throw AWSError.parseXML(response.body as string)
    }

    private _buildBody(form: any, request: SendMessageRequestParameters) {
        if (request.messageDeduplicationId) {
            form = { ...form,
                MessageDeduplicationId: request.messageDeduplicationId
            }
        }
        if (request.messageGroupId) {
            form = { ...form,
                MessageGroupId: request.messageGroupId
            }
        }

        return form
    }
}

export interface SendMessageRequestParameters {
    /**
     * The URL of the Amazon SQS queue to which a message is sent.
     * Queue URLs and names are case-sensitive.
     */
    queueUrl: string
    /**
     * The message to send. The minimum size is one character. The maximum size is 256 KB.
     */
    messageBody: string
    /**
     * The message deduplication id.
     */
    messageDeduplicationId?: string
    /**
     * The message group ID for FIFO queues
     */
    messageGroupId?: string
}

export interface SendMessageResponse {
    /**
     * An attribute containing the MessageId of the message sent to the queue.
     */
    messageId: string
    /**
     * An MD5 digest of the non-URL-encoded message body string. You can use this attribute to verify that Amazon SQS received the message correctly. Amazon SQS URL-decodes the message before creating the MD5 digest.
     */
    md5OfMessageBody: string
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
    queueUrls: string[]
    /**
     * Pagination token to include in the next request.
     */
    nextToken?: string
}