import { AWSClient } from './client'
import { AWSConfig } from './config'
import { SignatureV4 } from './signature'
import { HTTPHeaders, SignedHTTPRequest } from './http'
import http, { RefinedResponse, ResponseType } from 'k6/http'
import { toFormUrlEncoded } from './utils'
import { AWSError } from './error'

export class SqsClient extends AWSClient {
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

    sendMessage(request: SendMessageCommand): SendMessageResponse {
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
                body: toFormUrlEncoded({
                    Action: 'SendMessage',
                    Version: '2012-11-05',
                    QueueUrl: request.queueUrl,
                    MessageBody: request.messageBody
                })
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

    listQueues(request: ListQueuesCommand = {}): ListQueuesResponse {
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
                    Version: '2012-11-05',
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
            queues: parsed.find('QueueUrl').toArray().map(e => e.text()),
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
}

export interface SendMessageCommand {
    queueUrl: string
    messageBody: string
}

export interface SendMessageResponse {
    messageId: string
    md5OfMessageBody: string
}

export interface ListQueuesCommand {
    maxResults?: number
    nextToken?: string
    queueNamePrefix?: string
}

export interface ListQueuesResponse {
    queues: string[]
    nextToken?: string
}