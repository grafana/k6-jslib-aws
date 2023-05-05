import { JSONObject } from 'k6'
import http, { RefinedResponse, ResponseType } from 'k6/http'

import { AWSClient } from './client'

import { AWSConfig } from './config'
import { AMZ_TARGET_HEADER } from './constants'
import { AWSError } from './error'
import { HTTPHeaders } from './http'
import { InvalidSignatureError, SignatureV4 } from './signature'

/**
This API is based on
https://docs.aws.amazon.com/kinesis/latest/APIReference/API_Operations.html
*/

/**
 * Allows interacting with the Kinesis API.
 */
export class KinesisClient extends AWSClient {
    /**
     * The SignatureV4 object used to sign requests.
     */
    signature: SignatureV4

    /**
     * The common headers that are used for all requests.
     */
    commonHeaders: HTTPHeaders

    /**
     * The version of the Kinesis API that is used for all requests.
     */
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
    createStream(
        streamName: string,
        options: { shardCount?: number; streamModeDetails?: { streamMode: StreamMode } } = {}
    ): void {
        const body: any = {
            StreamName: streamName,
            ...(options.shardCount && { ShardCount: options.shardCount }),
            ...(options.streamModeDetails && { StreamMode: options.streamModeDetails.streamMode }),
        }

        this._send_request('CreateStream', body)
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
    deleteStream(
        streamName: string,
        parameters: { streamARN?: string; enforceConsumerDeletion?: boolean } = {}
    ): void {
        const body: any = {
            StreamName: streamName,
            ...(parameters.streamARN && { StreamARN: parameters.streamARN }),
            ...(parameters.enforceConsumerDeletion && {
                EnforceConsumerDeletion: parameters.enforceConsumerDeletion,
            }),
        }

        this._send_request('DeleteStream', body)
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
    listStreams(
        parameters: {
            exclusiveStartStreamName?: string
            limit?: number
            nextToken?: string
        } = {}
    ): ListStreamsResponse {
        const body: any = {
            ...(parameters.exclusiveStartStreamName && {
                ExclusiveStartStreamName: parameters.exclusiveStartStreamName,
            }),
            ...(parameters.limit && { Limit: parameters.limit }),
            ...(parameters.nextToken && { NextToken: parameters.nextToken }),
        }

        const res = this._send_request('ListStreams', body)
        return ListStreamsResponse.fromJson(res?.json())
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
    putRecords(
        records: PutRecordsRequestEntry[],
        parameters: { streamName?: string; streamARN?: string } = {}
    ): PutRecordsResponse {
        if (!parameters.streamName && !parameters.streamARN) {
            throw new Error('Either streamName or streamARN must be provided')
        }

        const body: any = {
            Records: records,
            ...(parameters.streamName && { StreamName: parameters.streamName }),
            ...(parameters.streamARN && { StreamARN: parameters.streamARN }),
        }

        const res = this._send_request('PutRecords', body)
        return PutRecordsResponse.fromJson(res?.json())
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
    getRecords(
        shardIterator: string,
        parameters: { limit?: number; streamARN?: string } = {}
    ): GetRecordsResponse {
        const body: any = {
            ShardIterator: shardIterator,
            ...(parameters.limit && { Limit: parameters.limit }),
            ...(parameters.streamARN && { StreamARN: parameters.streamARN }),
        }

        const res = this._send_request('GetRecords', body)
        return GetRecordsResponse.fromJson(res?.json())
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
    listShards(
        streamName: string,
        parameters: { nextToken?: string; maxResults?: number } = {}
    ): ListShardsResponse {
        const body: any = {
            StreamName: streamName,
            ...(parameters.nextToken && { NextToken: parameters.nextToken }),
            ...(parameters.maxResults && {
                MaxResults: parameters.maxResults,
            }),
        }

        const res = this._send_request('ListShards', body)
        return ListShardsResponse.fromJson(res?.json())
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
    getShardIterator(
        streamName: string,
        shardId: string,
        shardIteratorType: ShardIteratorKind,
        parameters: { startingSequenceNumber?: string; timestamp?: number } = {}
    ): GetShardIteratorResponse {
        const body: any = {
            StreamName: streamName,
            ShardId: shardId,
            ShardIteratorType: shardIteratorType,
            ...(parameters.startingSequenceNumber && {
                StartingSequenceNumber: parameters.startingSequenceNumber,
            }),
            ...(parameters.timestamp && { Timestamp: parameters.timestamp }),
        }

        const res = this._send_request('GetShardIterator', body)
        return GetShardIteratorResponse.fromJson(res?.json())
    }

    private _send_request(action: string, body: any): any {
        const signedRequest = this.signature.sign(
            {
                method: 'POST',
                protocol: this.awsConfig.scheme,
                hostname: this.host,
                path: '/',
                headers: {
                    ...this.commonHeaders,
                    [AMZ_TARGET_HEADER]: `${this.serviceVersion}.${action}`,
                },
                body: JSON.stringify(body),
            },
            {}
        )

        const res = http.request('POST', signedRequest.url, signedRequest.body, {
            headers: signedRequest.headers,
        })

        this._handle_error(action, res)
        return res
    }

    /**
     * If the response is an error, throw an error
     *
     * @param {string} operation - The name of the operation that was called.
     * @param response - RefinedResponse<ResponseType | undefined>
     * @returns The response is being returned.
     */
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

/**
 * Describes the options for a Kinesis stream.
 */
type StreamMode = 'PROVISIONED' | 'ON_DEMAND'

/**
 * Determines how the shard iterator is used to start reading data records from the shard.
 */
export type ShardIteratorKind =
    | 'AT_SEQUENCE_NUMBER'
    | 'AFTER_SEQUENCE_NUMBER'
    | 'TRIM_HORIZON'
    | 'LATEST'
    | 'AT_TIMESTAMP'

/**
 * Describes the status of a Kinesis data stream.
 */
export type StreamStatus = 'CREATING' | 'DELETING' | 'ACTIVE' | 'UPDATING'

export type StreamModeDetails = {
    /**
     * Specifies the capacity mode to which you want to set your data stream.
     */
    SteamMode: 'PROVISIONED' | 'ON_DEMAND'
}

export class ListStreamsResponse {
    /**
     * Indicates whether there are more streams available to list.
     */
    HasMoreStreams: boolean

    /**
     * The token that identifies which batch of results you can retrieve.
     */
    NextToken?: string

    /**
     * The names of the streams that are associated with the AWS account making the ListStreams request.
     */
    StreamNames: string[]

    /**
     * A list of StreamSummary objects.
     */
    StreamSummaries: StreamSummary[]

    constructor(
        HasMoreStreams: boolean,
        NextToken: string,
        StreamNames: string[],
        StreamSummaries: StreamSummary[]
    ) {
        this.HasMoreStreams = HasMoreStreams
        this.NextToken = NextToken
        this.StreamNames = StreamNames
        this.StreamSummaries = StreamSummaries
    }

    static fromJson(result: any): ListStreamsResponse {
        const {
            HasMoreStreams = false,
            NextToken = '',
            StreamNames = [],
            StreamSummaries = [],
        } = result

        return new ListStreamsResponse(
            HasMoreStreams,
            NextToken,
            StreamNames.map((s: any) => String(s)),
            StreamSummaries.map(StreamSummary.fromJson)
        )
    }
}

/**
 * Summarizes a Stream
 */
export class StreamSummary {
    /**
     * The Amazon Resource Name (ARN) for the stream.
     */
    StreamARN: string

    /**
     * The time at which the stream was created.
     */
    StreamCreationTimestamp: number

    /**
     * Specify the capacity mode to which you want to set your data stream.
     */
    StreamModeDetails: StreamModeDetails

    /**
     * The name of the stream.
     */
    StreamName: string

    /**
     * The current status of the stream being described.
     */
    StreamStatus: StreamStatus

    constructor(
        StreamARN: string,
        StreamCreationTimestamp: number,
        StreamMode: StreamModeDetails,
        StreamName: string,
        StreamStatus: StreamStatus
    ) {
        this.StreamARN = StreamARN
        this.StreamCreationTimestamp = StreamCreationTimestamp
        this.StreamModeDetails = StreamMode
        this.StreamName = StreamName
        this.StreamStatus = StreamStatus
    }

    static fromJson(summary: any): StreamSummary {
        const {
            StreamARN = '',
            StreamCreationTimestamp = 0,
            StreamModeDetails = {},
            StreamName = '',
            StreamStatus = '',
        } = summary

        return new StreamSummary(
            StreamARN,
            StreamCreationTimestamp,
            StreamModeDetails,
            StreamName,
            StreamStatus
        )
    }
}

/**
 * Represents the output for PutRecords.
 */
export interface PutRecordsRequestEntry {
    /**
     * The data blob to put into the record, which is base64-encoded when the blob is serialized.
     */
    Data: string | ArrayBuffer

    /**
     * Datemines which share in the stream the data record is assigned to.
     */
    PartitionKey: string
}

// Response class for PutRecords API
export class PutRecordsResponse {
    /**
     * The encryption type used on the records. This parameter can be one of the following values:
     *   - NONE: Do not encrypt the records.
     *   - KMS: Use server-side encryption on the records using a customer-managed AWS KMS key.
     */
    EncryptionType: 'NONE' | 'KMS'

    /**
     * The number of unsuccessfully processed records in a PutRecords request.
     */
    FailedRecordCount: number

    /**
     * An array of succesffully and unsuccessfully processed record results.
     */
    Records: PutRecordsResultEntry[]

    constructor(
        encryptionType: 'NONE' | 'KMS',
        failedRecordCount: number,
        records: PutRecordsResultEntry[]
    ) {
        this.EncryptionType = encryptionType
        this.FailedRecordCount = failedRecordCount
        this.Records = records
    }

    static fromJson(json: any): PutRecordsResponse {
        const { EncryptionType = 'NONE', FailedRecordCount = 0, Records = [] } = json
        const records = Records.map((record: any) => PutRecordsResultEntry.fromJson(record))

        return new PutRecordsResponse(EncryptionType, FailedRecordCount, records)
    }
}

/**
 * Represents the result of an individual record from a PutRecords request.
 */
export class PutRecordsResultEntry {
    /**
     * The sequence number for an individual record result.
     */
    SequenceNumber: string

    /**
     * The shard ID for an individual record result.
     */
    ShardId: string

    constructor(sequenceNumber: string, shardId: string) {
        this.SequenceNumber = sequenceNumber
        this.ShardId = shardId
    }

    static fromJson(json: any): PutRecordsResultEntry {
        return new PutRecordsResultEntry(json.SequenceNumber, json.ShardId)
    }
}

/**
 * Represents the response format of the GetRecords operation.
 */
export class GetRecordsResponse {
    /**
     * The next position in the shard from which to start sequentially reading data records.
     */
    NextShardIterator: string

    /**
     * The data records retrieved from the shard.
     */
    Records: Record[]

    constructor(nextShardIterator: string, records: Record[]) {
        this.NextShardIterator = nextShardIterator
        this.Records = records
    }

    static fromJson(json: any): GetRecordsResponse {
        const { NextShardIterator = '', Records = [] } = json
        const records = Records.map((record: Record) => Record.fromJson(record))

        return new GetRecordsResponse(NextShardIterator, records)
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
    Data: string | ArrayBuffer

    /**
     * Identifies which shard in the stream the data record is assigned to.
     */
    PartitionKey: string

    /**
     * The unique identifier of the record in the stream.
     */
    SequenceNumber: string

    constructor(data: string | ArrayBuffer, partitionKey: string, sequenceNumber: string) {
        this.Data = data
        this.PartitionKey = partitionKey
        this.SequenceNumber = sequenceNumber
    }

    static fromJson(json: any): Record {
        return new Record(json.Data, json.PartitionKey, json.SequenceNumber)
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
    Shards: Shard[]

    /**
     * When the number of shards in the data stream is greater than the
     * default value for the MaxResults parameter, or if you explicitly specify
     * a value for MaxResults that is less than the number of shards in the data
     * stream, the response includes a pagination token named NextToken.
     */
    NextToken?: string

    constructor(shards: Shard[], nextToken?: string) {
        this.Shards = shards
        this.NextToken = nextToken
    }

    static fromJson(json: any): ListShardsResponse {
        const { Shards = [], NextToken } = json
        const shards = Shards.map((shard: Shard) => Shard.fromJson(shard))

        return new ListShardsResponse(shards, NextToken)
    }
}

/**
 * A uniquely identified group of data records in a Kinesis data stream.
 */
export class Shard {
    /**
     * The unique identifier of the shard within the stream.
     */
    Id: string

    /**
     * The shard ID of the shard's parent.
     */
    ParentShardId?: string

    /**
     * The shard ID of the shard adjacent to the shard's parent.
     */
    AdjacentParentShardId?: string

    /**
     * The range of possible hash key values for the shard, which is a set of ordered contiguous positive integers.
     */
    HashKeyRange: HashKeyRange

    SequenceNumberRange: SequenceNumberRange

    constructor(
        id: string,
        hashKeyRange: HashKeyRange,
        sequenceNumberRange: SequenceNumberRange,
        parentShardId?: string,
        adjacentParentShardId?: string
    ) {
        this.Id = id
        this.ParentShardId = parentShardId
        this.AdjacentParentShardId = adjacentParentShardId
        this.HashKeyRange = hashKeyRange
        this.SequenceNumberRange = sequenceNumberRange
    }

    static fromJson(json: any): Shard {
        return new Shard(
            json.ShardId,
            json.HashKeyRange,
            json.SequenceNumberRange,
            json.ParentShardId,
            json.AdjacentParentShardId
        )
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
    StartingHashKey: string

    /**
     * The ending hash key of the hash key range.
     */
    EndingHashKey: string
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
    EndingSequenceNumber?: string

    /**
     * The starting sequence number for the range.
     */
    StartingSequenceNumber: string
}

/**
 * Describes a shard iterator response.
 */
class GetShardIteratorResponse {
    /**
     * The position in the shard from which to start reading data records sequentially.
     */
    ShardIterator: string

    constructor(shardIterator: string) {
        this.ShardIterator = shardIterator
    }

    static fromJson(json: any): GetShardIteratorResponse {
        return new GetShardIteratorResponse(json.ShardIterator)
    }
}
