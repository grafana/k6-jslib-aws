import http, { RefinedResponse, ResponseType } from "k6/http";

import { AWSClient } from "./client.ts";

import { AWSConfig } from "./config.ts";
import { AMZ_TARGET_HEADER } from "./constants.ts";
import { AWSError } from "./error.ts";
import { JSONObject } from "./json.ts";
import { HTTPHeaders } from "./http.ts";
import { InvalidSignatureError, SignatureV4 } from "./signature.ts";

/**
This API is based on
https://docs.aws.amazon.com/kinesis/latest/APIReference/API_Operations.html
*/

/**
 * Allows interacting with the Kinesis API.
 */
export class KinesisClient extends AWSClient {
  private readonly signature: SignatureV4;
  private readonly commonHeaders: HTTPHeaders;
  private readonly serviceVersion: string;

  /**
   * A constructor function that creates a new instance of the Kinesis class.
   * @param {AWSConfig} awsConfig - AWSConfig - This is the configuration object that is passed to
   * the constructor.
   * @returns A Proxy object.
   */
  constructor(awsConfig: AWSConfig) {
    super(awsConfig, "kinesis");

    this.serviceVersion = "Kinesis_20131202";

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
    });

    this.commonHeaders = {
      "Content-Type": "application/x-amz-json-1.1",
    };
  }

  /**
   * Creates a new Kinesis stream with the specified name and options.
   *
   * @param {string} streamName - The name of the stream to create.
   * @param {{
   *   shardCount?: number;
   *   streamModeDetails?: {
   *     streamMode: StreamMode;
   *   };
   * }} [options={}] - An optional object containing configuration options for the stream.
   * @param {number} [options.shardCount] - The number of shards for the stream. If not provided, the default value will be used.
   * @param {{streamMode: StreamMode}} [options.streamModeDetails] - An optional object containing the stream mode details.
   * @param {StreamMode} [options.streamModeDetails.streamMode] - The mode of the stream. If not provided, the default mode will be used.
   *
   * @throws {Error} Throws an error if the stream creation request fails.
   * @returns {void}
   */
  async createStream(
    streamName: string,
    options: {
      shardCount?: number;
      streamModeDetails?: { streamMode: StreamMode };
    } = {},
  ): Promise<void> {
    const body = {
      StreamName: streamName,
      ...(options.shardCount && { ShardCount: options.shardCount }),
      ...(options.streamModeDetails &&
        { StreamMode: options.streamModeDetails.streamMode }),
    };

    await this._send_request("CreateStream", body);
  }

  /**
   * Deletes a Kinesis stream with the specified parameters.
   *
   * @param {string} streamName - The name of the stream to delete.
   * @param {{
   *   streamARN?: string;
   *   enforceConsumerDeletion?: boolean;
   * }} [parameters={}] - An optional object containing configuration options for the stream deletion.
   * @param {string} [parameters.streamARN] - The Amazon Resource Name (ARN) of the stream. If not provided, the ARN will be derived from the stream name.
   * @param {boolean} [parameters.enforceConsumerDeletion] - Whether to enforce the deletion of all registered consumers before deleting the stream. Defaults to false.
   *
   * @throws {Error} Throws an error if the stream deletion request fails.
   * @returns {void}
   */
  async deleteStream(
    streamName: string,
    parameters: { streamARN?: string; enforceConsumerDeletion?: boolean } = {},
  ): Promise<void> {
    const body = {
      StreamName: streamName,
      ...(parameters.streamARN && { StreamARN: parameters.streamARN }),
      ...(parameters.enforceConsumerDeletion && {
        EnforceConsumerDeletion: parameters.enforceConsumerDeletion,
      }),
    };

    await this._send_request("DeleteStream", body);
  }

  /**
   * Returns a list of Kinesis streams with the specified parameters.
   *
   * @param {{
   *   exclusiveStartStreamName?: string;
   *   limit?: number;
   *   nextToken?: string;
   * }} [parameters={}] - An optional object containing configuration options for listing the streams.
   * @param {string} [parameters.exclusiveStartStreamName] - The name of the stream to start listing from. If not provided, the listing starts from the beginning.
   * @param {number} [parameters.limit] - The maximum number of streams to list. If not provided, the default value will be used.
   * @param {string} [parameters.nextToken] - A token to paginate the list of streams. If not provided, the first page will be returned.
   *
   * @throws {Error} Throws an error if the list streams request fails.
   * @returns {Partial<ListStreamsResponse>} A partial of the ListStreamsResponse class.
   */
  async listStreams(
    parameters: {
      exclusiveStartStreamName?: string;
      limit?: number;
      nextToken?: string;
    } = {},
  ): Promise<ListStreamsResponse> {
    const body = {
      ...(parameters.exclusiveStartStreamName && {
        ExclusiveStartStreamName: parameters.exclusiveStartStreamName,
      }),
      ...(parameters.limit && { Limit: parameters.limit }),
      ...(parameters.nextToken && { NextToken: parameters.nextToken }),
    };

    const res = await this._send_request("ListStreams", body);
    return ListStreamsResponse.fromJson(res?.json() as JSONObject);
  }

  /**
   * Sends multiple records to a Kinesis stream in a single request.
   *
   * @param {string} streamName - The name of the stream to put records into.
   * @param {PutRecordsRequestEntry[]} records - An array of records to put into the stream.
   *
   * @throws {Error} Throws an error if the put records request fails.
   * @returns {Partial<PutRecordsResponse>} A partial of the PutRecordsResponse class.
   */
  async putRecords(
    records: PutRecordsRequestEntry[],
    parameters: { streamName?: string; streamARN?: string } = {},
  ): Promise<PutRecordsResponse> {
    if (!parameters.streamName && !parameters.streamARN) {
      throw new Error("Either streamName or streamARN must be provided");
    }

    const body = {
      Records: records,
      ...(parameters.streamName && { StreamName: parameters.streamName }),
      ...(parameters.streamARN && { StreamARN: parameters.streamARN }),
    };

    const res = await this._send_request("PutRecords", body);
    return PutRecordsResponse.fromJson(res?.json() as JSONObject);
  }

  /**
   * Retrieves records from a Kinesis stream.
   *
   * @param {string} shardIterator - The shard iterator to start retrieving records from.
   * @param {number} [limit] - The maximum number of records to return. If not provided, the default value will be used.
   *
   * @throws {Error} Throws an error if the get records request fails.
   * @returns {Partial<GetRecordsResponse>} A partial of the GetRecordsResponse class.
   */
  async getRecords(
    shardIterator: string,
    parameters: { limit?: number; streamARN?: string } = {},
  ): Promise<GetRecordsResponse> {
    const body = {
      ShardIterator: shardIterator,
      ...(parameters.limit && { Limit: parameters.limit }),
      ...(parameters.streamARN && { StreamARN: parameters.streamARN }),
    };

    const res = await this._send_request("GetRecords", body);
    return GetRecordsResponse.fromJson(res?.json() as JSONObject);
  }

  /**
   * Lists the shards in a Kinesis stream.
   *
   * @param {string} streamName - The name of the stream to list shards from.
   * @param {{
   *   nextToken?: string;
   *   maxResults?: number;
   * }} [parameters={}] - An optional object containing configuration options for listing shards.
   * @param {string} [parameters.nextToken] - A token to specify where to start paginating the shard list. If not provided, the first page will be returned.
   * @param {number} [parameters.maxResults] - The maximum number of shards to return. If not provided, the default value will be used.
   *
   * @throws {Error} Throws an error if the list shards request fails.
   * @returns {ListShardsResponse} A ListShardsResponse class instance.
   */
  async listShards(
    streamName: string,
    parameters: { nextToken?: string; maxResults?: number } = {},
  ): Promise<ListShardsResponse> {
    const body = {
      StreamName: streamName,
      ...(parameters.nextToken && { NextToken: parameters.nextToken }),
      ...(parameters.maxResults && {
        MaxResults: parameters.maxResults,
      }),
    };

    const res = await this._send_request("ListShards", body);
    return ListShardsResponse.fromJson(res?.json() as JSONObject);
  }

  /**
   * Retrieves a shard iterator for the specified shard in a Kinesis stream.
   *
   * @param {string} streamName - The name of the stream.
   * @param {string} shardId - The shard ID for which to get the iterator.
   * @param {string} shardIteratorType - The shard iterator type. One of 'AT_SEQUENCE_NUMBER', 'AFTER_SEQUENCE_NUMBER', 'TRIM_HORIZON', 'LATEST', or 'AT_TIMESTAMP'.
   * @param {{
   *   startingSequenceNumber?: string;
   *   timestamp?: number;
   * }} [parameters={}] - An optional object containing configuration options for the shard iterator.
   * @param {string} [parameters.startingSequenceNumber] - The sequence number to start with when using 'AT_SEQUENCE_NUMBER' or 'AFTER_SEQUENCE_NUMBER' iterator types.
   * @param {number} [parameters.timestamp] - The timestamp to start with when using the 'AT_TIMESTAMP' iterator type.
   *
   * @throws {Error} Throws an error if the get shard iterator request fails.
   * @returns {string} The next position in the shard from which to start sequentially reading data records. If set to null, the shard has been closed and the requested iterator does not return any more data.
   */
  async getShardIterator(
    streamName: string,
    shardId: string,
    shardIteratorType: ShardIteratorKind,
    parameters: { startingSequenceNumber?: string; timestamp?: number } = {},
  ): Promise<GetShardIteratorResponse> {
    const body = {
      StreamName: streamName,
      ShardId: shardId,
      ShardIteratorType: shardIteratorType,
      ...(parameters.startingSequenceNumber && {
        StartingSequenceNumber: parameters.startingSequenceNumber,
      }),
      ...(parameters.timestamp && { Timestamp: parameters.timestamp }),
    };

    const res = await this._send_request("GetShardIterator", body);
    return GetShardIteratorResponse.fromJson(res?.json() as JSONObject);
  }

  private async _send_request<R extends ResponseType>(
    action: string,
    body: unknown,
  ): Promise<RefinedResponse<R>> {
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

    this.handleError(res, action);
    return res;
  }

  protected override handleError(
    response: RefinedResponse<ResponseType | undefined>,
    operation?: string,
  ): boolean {
    const errored = super.handleError(response, operation);
    if (!errored) {
      return false;
    }

    const errorCode = response.error_code;
    const error = response.json() as JSONObject;
    if (errorCode >= 1400 && errorCode <= 1499) {
      // In the event of certain errors, the message is not set.
      // Also, note the inconsistency in casing...
      const errorMessage: string = (error.Message as string) ||
        (error.message as string) || (error.__type as string);

      // Handle specifically the case of an invalid signature
      if (error.__type === "InvalidSignatureException") {
        throw new InvalidSignatureError(errorMessage, error.__type);
      }

      // Otherwise throw a standard service error
      throw new KinesisServiceError(
        errorMessage,
        error.__type as string,
        operation || "Unknown",
      );
    }

    if (errorCode === 1500) {
      throw new KinesisServiceError(
        "An error occured on the server side",
        "InternalServiceError",
        operation || "Unknown",
      );
    }

    return true;
  }
}

/* `KinesisServiceError` is a subclass of `AWSError` that adds an `operation` property */
export class KinesisServiceError extends AWSError {
  operation: string;

  /**
   * Constructs a KinesisServiceError
   *
   * @param  {string} message - human readable error message
   * @param  {string} code - A unique short code representing the error that was emitted
   * @param  {string} operation - Name of the failed Operation
   */
  constructor(message: string, code: string, operation: string) {
    super(message, code);
    this.name = "KinesisServiceError";
    this.operation = operation;
  }
}

/**
 * Describes the options for a Kinesis stream.
 */
type StreamMode = "PROVISIONED" | "ON_DEMAND";

/**
 * Determines how the shard iterator is used to start reading data records from the shard.
 */
export type ShardIteratorKind =
  | "AT_SEQUENCE_NUMBER"
  | "AFTER_SEQUENCE_NUMBER"
  | "TRIM_HORIZON"
  | "LATEST"
  | "AT_TIMESTAMP";

/**
 * Describes the status of a Kinesis data stream.
 */
export type StreamStatus = "CREATING" | "DELETING" | "ACTIVE" | "UPDATING";

export type StreamModeDetails = {
  /**
   * Specifies the capacity mode to which you want to set your data stream.
   */
  SteamMode: "PROVISIONED" | "ON_DEMAND";
};

export class ListStreamsResponse {
  /**
   * Indicates whether there are more streams available to list.
   */
  hasMoreStreams: boolean;

  /**
   * The token that identifies which batch of results you can retrieve.
   */
  nextToken?: string;

  /**
   * The names of the streams that are associated with the AWS account making the ListStreams request.
   */
  streamNames: string[];

  /**
   * A list of StreamSummary objects.
   */
  streamSummaries: StreamSummary[];

  constructor(
    HasMoreStreams: boolean,
    NextToken: string,
    StreamNames: string[],
    StreamSummaries: StreamSummary[],
  ) {
    this.hasMoreStreams = HasMoreStreams;
    this.nextToken = NextToken;
    this.streamNames = StreamNames;
    this.streamSummaries = StreamSummaries;
  }

  static fromJson(result: JSONObject): ListStreamsResponse {
    const {
      HasMoreStreams = false,
      NextToken = "",
      StreamNames = [],
      StreamSummaries = [],
    } = result;

    return new ListStreamsResponse(
      HasMoreStreams as boolean,
      NextToken as string,
      StreamNames as string[],
      (StreamSummaries as JSONObject[])?.map(
        StreamSummary.fromJson,
      ) as StreamSummary[],
    );
  }
}

/**
 * Summarizes a Stream
 */
export class StreamSummary {
  /**
   * The Amazon Resource Name (ARN) for the stream.
   */
  streamARN: string;

  /**
   * The time at which the stream was created.
   */
  streamCreationTimestamp: number;

  /**
   * Specify the capacity mode to which you want to set your data stream.
   */
  streamModeDetails: StreamModeDetails;

  /**
   * The name of the stream.
   */
  streamName: string;

  /**
   * The current status of the stream being described.
   */
  streamStatus: StreamStatus;

  constructor(
    StreamARN: string,
    StreamCreationTimestamp: number,
    StreamMode: StreamModeDetails,
    StreamName: string,
    StreamStatus: StreamStatus,
  ) {
    this.streamARN = StreamARN;
    this.streamCreationTimestamp = StreamCreationTimestamp;
    this.streamModeDetails = StreamMode;
    this.streamName = StreamName;
    this.streamStatus = StreamStatus;
  }

  static fromJson(summary: JSONObject): StreamSummary {
    const {
      StreamARN = "",
      StreamCreationTimestamp = 0,
      StreamModeDetails = {},
      StreamName = "",
      StreamStatus = "",
    } = summary;

    return new StreamSummary(
      StreamARN as string,
      StreamCreationTimestamp as number,
      StreamModeDetails as StreamModeDetails,
      StreamName as string,
      StreamStatus as StreamStatus,
    );
  }
}

/**
 * Represents the output for PutRecords.
 */
export interface PutRecordsRequestEntry {
  /**
   * The data blob to put into the record, which is base64-encoded when the blob is serialized.
   */
  Data: string | ArrayBuffer;

  /**
   * Determines which share in the stream the data record is assigned to.
   */
  PartitionKey: string;
}

// Response class for PutRecords API
export class PutRecordsResponse {
  /**
   * The encryption type used on the records. This parameter can be one of the following values:
   *   - NONE: Do not encrypt the records.
   *   - KMS: Use server-side encryption on the records using a customer-managed AWS KMS key.
   */
  encryptionType: EncryptionType;

  /**
   * The number of unsuccessfully processed records in a PutRecords request.
   */
  failedRecordCount: number;

  /**
   * An array of successfully and unsuccessfully processed record results.
   */
  records: PutRecordsResultEntry[];

  constructor(
    encryptionType: "NONE" | "KMS",
    failedRecordCount: number,
    records: PutRecordsResultEntry[],
  ) {
    this.encryptionType = encryptionType;
    this.failedRecordCount = failedRecordCount;
    this.records = records;
  }

  static fromJson(json: JSONObject): PutRecordsResponse {
    const { EncryptionType = "NONE", FailedRecordCount = 0, Records = [] } =
      json;
    const records = (Records as JSONObject[]).map(
      PutRecordsResultEntry.fromJson,
    );

    return new PutRecordsResponse(
      EncryptionType as EncryptionType,
      FailedRecordCount as number,
      records,
    );
  }
}

type EncryptionType = "NONE" | "KMS";

/**
 * Represents the result of an individual record from a PutRecords request.
 */
export class PutRecordsResultEntry {
  /**
   * The sequence number for an individual record result.
   */
  sequenceNumber: string;

  /**
   * The shard ID for an individual record result.
   */
  shardId: string;

  constructor(sequenceNumber: string, shardId: string) {
    this.sequenceNumber = sequenceNumber;
    this.shardId = shardId;
  }

  static fromJson(json: JSONObject): PutRecordsResultEntry {
    return new PutRecordsResultEntry(
      json.SequenceNumber as string,
      json.ShardId as string,
    );
  }
}

/**
 * Represents the response format of the GetRecords operation.
 */
export class GetRecordsResponse {
  /**
   * The next position in the shard from which to start sequentially reading data records.
   */
  nextShardIterator: string;

  /**
   * The data records retrieved from the shard.
   */
  records: Record[];

  /**
   * The number of milliseconds the GetRecords response is from the
   * tip of the stream, indicating how far behind current time the
   * consumer is.
   *
   * A value of zero indicates that record processing is caught
   * up, and there are no new records to process at this moment.
   */
  millisBehindLatest: number;

  constructor(
    nextShardIterator: string,
    records: Record[],
    millisBehindLatest: number,
  ) {
    this.nextShardIterator = nextShardIterator;
    this.records = records;
    this.millisBehindLatest = millisBehindLatest;
  }

  static fromJson(json: JSONObject): GetRecordsResponse {
    const { NextShardIterator = "", Records = [], MillisBehindLatest = 0 } =
      json;
    const records = (Records as JSONObject[]).map(Record.fromJson);

    return new GetRecordsResponse(
      NextShardIterator as string,
      records as Record[],
      MillisBehindLatest as number,
    );
  }
}

/**
 * The unit of data of the Kinesis data stream, which is composed of a sequence
 * number, a partition key, and a data blob.
 */
class Record {
  /**
   * The data blob.
   */
  data: string | ArrayBuffer;

  /**
   * Identifies which shard in the stream the data record is assigned to.
   */
  partitionKey: string;

  /**
   * The unique identifier of the record in the stream.
   */
  sequenceNumber: string;

  constructor(
    data: string | ArrayBuffer,
    partitionKey: string,
    sequenceNumber: string,
  ) {
    this.data = data;
    this.partitionKey = partitionKey;
    this.sequenceNumber = sequenceNumber;
  }

  static fromJson(json: JSONObject): Record {
    return new Record(
      json.Data as string | ArrayBuffer,
      json.PartitionKey as string,
      json.SequenceNumber as string,
    );
  }
}

// Response class for ListShards API
export class ListShardsResponse {
  /**
   * An array of JSON objects.
   *
   * Each object represents one shard and specifies the IDs of the shard, the
   * shard's parent, and the shard that's adjacent to the shard's parent.
   */
  shards: Shard[];

  /**
   * When the number of shards in the data stream is greater than the
   * default value for the MaxResults parameter, or if you explicitly specify
   * a value for MaxResults that is less than the number of shards in the data
   * stream, the response includes a pagination token named NextToken.
   */
  nextToken?: string;

  constructor(shards: Shard[], nextToken?: string) {
    this.shards = shards;
    this.nextToken = nextToken;
  }

  static fromJson(json: JSONObject): ListShardsResponse {
    const { Shards = [], NextToken } = json;
    const shards = (Shards as JSONObject[]).map(Shard.fromJson);

    return new ListShardsResponse(shards, NextToken as string | undefined);
  }
}

/**
 * A uniquely identified group of data records in a Kinesis data stream.
 */
export class Shard {
  /**
   * The unique identifier of the shard within the stream.
   */
  id: string;

  /**
   * The shard ID of the shard's parent.
   */
  parentShardId?: string;

  /**
   * The shard ID of the shard adjacent to the shard's parent.
   */
  adjacentParentShardId?: string;

  /**
   * The range of possible hash key values for the shard, which is a set of ordered contiguous positive integers.
   */
  hashKeyRange: HashKeyRange;

  sequenceNumberRange: SequenceNumberRange;

  constructor(
    id: string,
    hashKeyRange: HashKeyRange,
    sequenceNumberRange: SequenceNumberRange,
    parentShardId?: string,
    adjacentParentShardId?: string,
  ) {
    this.id = id;
    this.parentShardId = parentShardId;
    this.adjacentParentShardId = adjacentParentShardId;
    this.hashKeyRange = hashKeyRange;
    this.sequenceNumberRange = sequenceNumberRange;
  }

  static fromJson(json: JSONObject): Shard {
    return new Shard(
      json.ShardId as string,
      json.HashKeyRange as unknown as HashKeyRange,
      json.SequenceNumberRange as unknown as SequenceNumberRange,
      json.ParentShardId as string | undefined,
      json.AdjacentParentShardId as string | undefined,
    );
  }
}

/**
 * Describes the range of possible hash key values for the shard, which is
 * a set of ordered contiguous positive integers.
 */
export interface HashKeyRange {
  /**
   * The starting hash key of the hash key range.
   */
  startingHashKey: string;

  /**
   * The ending hash key of the hash key range.
   */
  endingHashKey: string;
}

/**
 * The range of possible sequence numbers for the shard.
 */
export interface SequenceNumberRange {
  /**
   * The ending sequence number for the range.
   *
   * Shards that are in the OPEN state have an ending sequence number of null.
   */
  endingSequenceNumber?: string;

  /**
   * The starting sequence number for the range.
   */
  startingSequenceNumber: string;
}

/**
 * Describes a shard iterator response.
 */
class GetShardIteratorResponse {
  /**
   * The position in the shard from which to start reading data records sequentially.
   */
  shardIterator: string;

  constructor(shardIterator: string) {
    this.shardIterator = shardIterator;
  }

  static fromJson(json: JSONObject): GetShardIteratorResponse {
    return new GetShardIteratorResponse(json.ShardIterator as string);
  }
}
