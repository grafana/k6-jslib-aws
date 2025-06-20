import http, { RefinedResponse, ResponseType } from "k6/http";

import { AWSClient } from "./client.ts";
import { AWSConfig } from "./config.ts";
import { InvalidSignatureError, SignatureV4 } from "./signature.ts";
import { HTTPHeaders } from "./http.ts";
import { AWSError } from "./error.ts";
import { AMZ_TARGET_HEADER } from "./constants.ts";
import { JSONArray, JSONObject } from "./json.ts";

export class SQSClient extends AWSClient {
  private readonly signature: SignatureV4;
  private readonly commonHeaders: HTTPHeaders;

  private readonly serviceVersion: string;

  constructor(awsConfig: AWSConfig) {
    super(awsConfig, "sqs");

    this.serviceVersion = "AmazonSQS";

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
    });

    this.commonHeaders = {
      "Content-Type": "application/x-amz-json-1.0",
    };
  }

  /**
   * Deletes a specific AWS SQS message with a unique, most-recent receipt handle for the message.
   *
   * @see https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_DeleteMessage.html
   * @param {string} queueUrl - The URL of the Amazon SQS queue from which the message should be deleted from.
   * @param {string} receiptHandle The unique, most-recent receipt handle for the message to delete
   */
  async deleteMessage(queueUrl: string, receiptHandle: string) {
    const action = "DeleteMessage";

    const body = {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    };

    await this._sendRequest(action, body);
  }

  /**
   * Receives messages from the specified AWS SQS queue.
   *
   * @see https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
   * @param {string} queueUrl - The URL of the Amazon SQS queue from which messages should be received. Queue URLs and names are case-sensitive.
   * @param {string[]} messageAttributeNames - List of message attributes to receive.
   * @param {string[]} messageSystemAttributeNames - List of attributes that must be returned with each message.
   * @param {number} maxNumberOfMessages - The maximum number of messages to receive from the Amazon SQS queue.
   * @param {number} visibilityTimeout - Number of seconds to "hide" the received messages from subsequent ReceiveMessage requests.
   * @param {number} waitTimeSeconds - Number of seconds to wait for messages from the Amazon SQS queue.
   * @param {string | undefined} receiveRequestAttemptId - Value to use for ReceiveMessage deduplication on FIFO queues.
   * @returns {ReceivedMessage[]} - The list of received messages.
   */
  async receiveMessages(
    queueUrl: string,
    messageAttributeNames: string[] = ["All"],
    messageSystemAttributeNames: string[] = ["All"],
    maxNumberOfMessages: number = 1,
    visibilityTimeout: number = 30,
    waitTimeSeconds: number = 10,
    receiveRequestAttemptId: string | undefined,
  ): Promise<ReceivedMessage[]> {
    const action = "ReceiveMessage";

    const body = {
      MaxNumberOfMessages: maxNumberOfMessages,
      MessageAttributeNames: messageAttributeNames,
      MessageSystemAttributeNames: messageSystemAttributeNames,
      QueueUrl: queueUrl,
      VisibilityTimeout: visibilityTimeout,
      WaitTimeSeconds: waitTimeSeconds,
      ReceiveRequestAttemptId: receiveRequestAttemptId,
    };

    const res = await this._sendRequest(action, body);

    const parsed = res.json() as JSONObject;
    const messagesArray = parsed["Messages"] as JSONArray;

    const messages = [] as ReceivedMessage[];
    messagesArray?.forEach((msg) =>
      messages.push(new ReceivedMessage(msg as JSONObject))
    );

    return messages;
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
    options: SendMessageOptions = {},
  ): Promise<MessageResponse> {
    const action = "SendMessage";

    const body = {
      QueueUrl: queueUrl,
      ...this._combineQueueMessageBodyAndOptions(messageBody, options),
    };

    const res = await this._sendRequest(action, body);

    const parsed = res.json() as JSONObject;
    return new MessageResponse(
      parsed["MessageId"] as string,
      parsed["MD5OfMessageBody"] as string,
    );
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
    entries: SendMessageBatchEntry[],
  ): Promise<MessageBatchResponse> {
    const action = "SendMessageBatch";

    const requestMessageEntries = entries.map((entry) => {
      let requestMessageEntry = this._combineQueueMessageBodyAndOptions(
        entry.messageBody,
        entry.messageOptions,
      );
      requestMessageEntry = { ...requestMessageEntry, Id: entry.messageId };
      return requestMessageEntry;
    });

    const body = { QueueUrl: queueUrl, Entries: requestMessageEntries };

    const res = await this._sendRequest(action, body);

    const parsed = res.json() as JSONObject;
    const successful: JSONObject[] = (parsed["Successful"] as JSONObject[]) ||
      [];
    const failed: JSONObject[] = (parsed["Failed"] as JSONObject[]) || [];

    return {
      successful: successful.map(
        (entry) =>
          new MessageResponse(
            entry["MessageId"] as string,
            entry["MD5OfMessageBody"] as string,
          ),
      ),
      failed: failed.map(
        (entry) =>
          new SQSServiceError(
            entry["Message"] as string,
            entry["Code"] as string,
            action,
          ),
      ),
    };
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
  async listQueues(
    parameters: ListQueuesRequestParameters = {},
  ): Promise<ListQueuesResponse> {
    const action = "ListQueues";

    let body: object = {};

    if (typeof parameters?.maxResults !== "undefined") {
      body = { ...body, MaxResults: parameters.maxResults };
    }

    if (typeof parameters?.nextToken !== "undefined") {
      body = { ...body, NextToken: parameters.nextToken };
    }

    if (typeof parameters?.queueNamePrefix !== "undefined") {
      body = { ...body, QueueNamePrefix: parameters.queueNamePrefix };
    }

    const res = await this._sendRequest(action, body);

    const parsed = res.json() as JSONObject;
    return {
      urls: parsed["QueueUrls"] as string[],
      nextToken: parsed?.NextToken as string,
    };
  }

  private _combineQueueMessageBodyAndOptions(
    messageBody: string,
    options?: SendMessageOptions,
  ): object {
    let body: object = { MessageBody: messageBody };

    if (options === undefined) {
      return body;
    }

    if (typeof options.messageDeduplicationId !== "undefined") {
      body = {
        ...body,
        MessageDeduplicationId: options.messageDeduplicationId,
      };
    }

    if (typeof options.messageGroupId !== "undefined") {
      body = { ...body, MessageGroupId: options.messageGroupId };
    }

    if (typeof options.messageAttributes !== "undefined") {
      const messageAttributes: Record<string, Record<string, string>> = {};

      for (
        const [name, attribute] of Object.entries(options.messageAttributes)
      ) {
        const valueParameterSuffix = attribute.type === "Binary"
          ? "BinaryValue"
          : "StringValue";
        messageAttributes[name] = {
          DataType: attribute.type,
        };
        messageAttributes[name][valueParameterSuffix] = attribute.value;
      }

      body = { ...body, MessageAttributes: messageAttributes };
    }

    if (typeof options.delaySeconds !== "undefined") {
      body = { ...body, DelaySeconds: options.delaySeconds };
    }

    return body;
  }

  private async _sendRequest(
    action: SQSOperation,
    body: object,
  ): Promise<RefinedResponse<ResponseType>> {
    const signedRequest = this.signature.sign(
      {
        method: "POST",
        endpoint: this.endpoint,
        path: "/",
        headers: {
          ...this.commonHeaders,
          [AMZ_TARGET_HEADER]: `${this.serviceVersion}.${action}`,
        },
        body: JSON.stringify(body),
      },
      {},
    );

    const res = await http.asyncRequest(
      "POST",
      signedRequest.url,
      signedRequest.body,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );

    this._handleError(action, res);
    return res;
  }

  private _handleError(
    operation: SQSOperation,
    response: RefinedResponse<ResponseType | undefined>,
  ) {
    const errorCode: number = response.error_code;

    if (errorCode === 0) {
      return;
    }

    const error = response.json() as JSONObject;

    const errorMessage: string = (error.Message as string) ||
      (error.message as string) || (error.__type as string);

    switch (error.__type) {
      case "InvalidSignatureException":
        throw new InvalidSignatureError(errorMessage, error.__type);
      default:
        throw new SQSServiceError(
          errorMessage,
          error.__type as string,
          operation,
        );
    }
  }

  protected override handleError(
    response: RefinedResponse<ResponseType | undefined>,
    operation?: string,
  ): boolean {
    const errored = super.handleError(response);
    if (!errored) {
      return false;
    }

    const errorCode: number = response.error_code;

    if (errorCode === 0) {
      return false;
    }

    const error = response.json() as JSONObject;

    const errorMessage: string = (error.Message as string) ||
      (error.message as string) || (error.__type as string);

    switch (error.__type) {
      case "InvalidSignatureException":
        throw new InvalidSignatureError(errorMessage, error.__type);
      default:
        throw new SQSServiceError(
          errorMessage,
          error.__type as string,
          operation as SQSOperation,
        );
    }
  }
}

/**
 * Attributes of a {@link ReceivedMessage} object from an Amazon SQS queue.
 */
export class ReceivedMessageAttributes {
  /**
   * A tag that specifies which specific message group the message belongs to.
   */
  MessageGroupId: string;

  /**
   * The AWS X-Ray trace header string.
   */
  AWSTraceHeader: string;

  /**
   * The user ID or IAM role which sent the message.
   */
  SenderId: string;

  /**
   * The approximate epoch time (in milliseconds) the message was first received from the queue.
   */
  ApproximateFirstReceiveTimestamp: string;

  /**
   * The approximate number of times the message has been received across all queues but not deleted.
   */
  ApproximateReceiveCount: string;

  /**
   * The epoch time (in milliseconds) the message was sent to the AWS SQS queue.
   */
  SentTimestamp: string;

  /**
   * The value provided by Amazon SQS.
   */
  SequenceNumber: string;

  /**
   * The token used for deduplication of sent messages.
   * This field only applies to FIFO queues.
   */
  MessageDeduplicationId: string;

  /**
   * Instantiates a new ReceivedMessageAttributes object.
   *
   * @param capturedMessageAttributes
   */
  constructor(capturedMessageAttributes: JSONObject) {
    this.MessageGroupId = capturedMessageAttributes
      ?.["MessageGroupId"] as string;
    this.AWSTraceHeader = capturedMessageAttributes
      ?.["AWSTraceHeader"] as string;
    this.SenderId = capturedMessageAttributes?.["SenderId"] as string;
    this.ApproximateFirstReceiveTimestamp = capturedMessageAttributes?.[
      "ApproximateFirstReceiveTimestamp"
    ] as string;
    this.ApproximateReceiveCount = capturedMessageAttributes?.[
      "ApproximateReceiveCount"
    ] as string;
    this.SentTimestamp = capturedMessageAttributes?.["SentTimestamp"] as string;
    this.SequenceNumber = capturedMessageAttributes
      ?.["SequenceNumber"] as string;
    this.MessageDeduplicationId = capturedMessageAttributes?.[
      "MessageDeduplicationId"
    ] as string;
  }
}

/**
 * A received message while monitoring an Amazon SQS queue.
 */
export class ReceivedMessage {
  /**
   * Tag to identify the class
   */
  toStringTag: string = "ReceivedMessage";

  /**
   * A unique identifier for the message.
   * A MessageId is considered unique across all AWS accounts for an extended period of time.
   */
  id: string;

  /**
   * An MD5 digest of the non-URL-encoded message body string.
   */
  BodyMD5: string;

  /**
   * An identifier associated with the act of receiving the message.
   * A new receipt handle is returned every time you receive a message.
   * When deleting a message, you provide the last received receipt handle to delete the message.
   */
  ReceiptHandle: string;

  /**
   * The message's contents (not URL-encoded).
   */
  Body: string;

  /**
   * A map of the requested attributes to their respective values.
   */
  Attributes: ReceivedMessageAttributes;

  /**
   * Instantiates a new Message object.
   *
   * @param capturedMessage
   */
  constructor(capturedMessage: JSONObject) {
    this.id = capturedMessage["MessageId"] as string;
    this.BodyMD5 = capturedMessage["BodyMD5"] as string;
    this.ReceiptHandle = capturedMessage["ReceiptHandle"] as string;
    this.Body = capturedMessage["Body"] as string;
    this.Attributes = new ReceivedMessageAttributes(
      capturedMessage["Attributes"]! as JSONObject,
    );
  }
}

/**
 * An Amazon SQS message.
 */
export class MessageResponse {
  /**
   * A unique identifier for the message.
   * A MessageId is considered unique across all AWS accounts for an extended period of time.
   */
  id: string;

  /**
   * An MD5 digest of the non-URL-encoded message body string.
   */
  bodyMD5: string;

  /**
   * Instantiates a new Message object.
   *
   * @param id
   * @param md5Ofbody
   */
  constructor(id: string, bodyMD5: string) {
    this.id = id;
    this.bodyMD5 = bodyMD5;
  }
}

/**
 * An Amazon SQS message Batch Response.
 */
export class MessageBatchResponse {
  /**
   * A list of successful messages.
   */
  successful: MessageResponse[];

  /**
   * A list of failed messages.
   */
  failed: SQSServiceError[];

  /**
   * Instantiates a new MessageBatchResponse object.
   *
   * @param successful
   * @param failed
   */
  constructor(successful: MessageResponse[], failed: SQSServiceError[]) {
    this.successful = successful;
    this.failed = failed;
  }
}

/**
 * SQSServiceError indicates an error occurred while interacting with the SQS API.
 */
export class SQSServiceError extends AWSError {
  operation: SQSOperation;

  constructor(message: string, code: string, operation: SQSOperation) {
    super(message, code);
    this.name = "SQSServiceError";
    this.operation = operation;
  }
}

/**
 * SQSOperation describes possible SQS operations.
 */
type SQSOperation =
  | "DeleteMessage"
  | "ListQueues"
  | "ReceiveMessage"
  | "SendMessage"
  | "SendMessageBatch";

export interface SendMessageOptions {
  /**
   * The message deduplication ID for FIFO queues
   */
  messageDeduplicationId?: string;

  /**
   * The message group ID for FIFO queues
   */
  messageGroupId?: string;

  /**
   * The message attributes
   */
  messageAttributes?: {
    [name: string]: { type: "String" | "Number" | "Binary"; value: string };
  };

  /**
   * The length of time, in seconds, for which to delay a specific message.
   */
  delaySeconds?: number;
}

export interface SendMessageBatchEntry {
  messageId: string;
  messageBody: string;
  messageOptions?: SendMessageOptions;
}

export interface ListQueuesRequestParameters {
  /**
   * Maximum number of results to include in the response. Value range is 1 to 1000.
   */
  maxResults?: number;
  /**
   * Pagination token to request the next set of results.
   */
  nextToken?: string;
  /**
   * A string to use for filtering the list results. Only those queues whose name begins with the specified string are returned.
   * Queue URLs and names are case-sensitive.
   */
  queueNamePrefix?: string;
}

export interface ListQueuesResponse {
  /**
   * A list of queue URLs, up to 1,000 entries, or the value of MaxResults you sent in the request.
   */
  urls: string[];
  /**
   * Pagination token to include in the next request.
   */
  nextToken?: string;
}
