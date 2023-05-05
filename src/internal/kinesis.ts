/**
 * It creates a new KinesisClient object and returns it.
 * @param {T} obj - T - The object that we're checking for the key.
 * @param k - The number of virtual users to simulate.
 */
import { JSONArray, JSONObject } from 'k6'
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
        options: JSONObject | CreateStreamRequest | PutRecordsRequest | DeleteStreamRequest | Partial<ListStreamRequest> = {}): RefinedResponse<ResponseType | undefined> | undefined {

        // handling additional operations as lib standard
        target = target[0].toUpperCase() + target.slice(1)

        const signedRequest = this.signature.sign(
            {
                method: 'POST',
                protocol: this.awsConfig.scheme,
                hostname: this.host,
                path: '/',
                headers: {
                    ...this.commonHeaders,
                    [AMZ_TARGET_HEADER]: `${this.serviceVersion}.${target}`,
                },
                body: JSON.stringify(options),
            },
            {}
        )

        let res = undefined;
        try {
            res = http.request('POST', signedRequest.url, signedRequest.body, {
                headers: signedRequest.headers,
            })

            this._handle_error(target, res)
        }
        catch (err) {
            console.log("Error with current request from k6-jslib-aws-extension")
            console.log(err)
        }

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

        console.log("Error with current response from k6-jslib-aws-extension")
        console.log(response)

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



    /**
     * It creates a stream.
     * @param {CreateStreamRequest} request - CreateStreamRequest - The request object that will be
     * sent to the server.
     */
    createStream(request: CreateStreamRequest): void {
        this.RequestOperation(`CreateStream`, request)
    }

    /**
     * It deletes a stream.
     * @param request - Partial<DeleteStreamRequest>
     */
    deleteStream(request: Partial<DeleteStreamRequest>): void {
        this.RequestOperation(`DeleteStream`, request)
    }

    /**
     * It returns a list of streams.
     * @param request - Partial<ListStreamRequest> = {}
     * @returns A partial of the ListStreamsResponse class.
     */
    listStreams(request: Partial<ListStreamRequest> = {}): Partial<ListStreamsResponse> {
        const res = this.RequestOperation(`ListStreams`, request)
        return ListStreamsResponse.fromJson(res.json())
    }

    /**
     * It takes a request object and returns a response object.
     * @param {PutRecordsRequest} request - PutRecordsRequest
     * @returns A partial of the PutRecordsResponse class.
     */
    putRecords(request: PutRecordsRequest): Partial<PutRecordsResponse> {
        const res = this.RequestOperation(`PutRecords`, request)
        return PutRecordsResponse.fromJson(res.json())
    }

    /**
     * It gets the records from the database.
     * @param {GetRecordsRequest} request - GetRecordsRequest
     * @returns A partial of the GetRecordsResponse class.
     */
    getRecords(request: GetRecordsRequest): Partial<GetRecordsResponse> {
        const res = this.RequestOperation(`GetRecords`, request)
        return GetRecordsResponse.fromJson(res.json())
    }

    /**
     * It lists the shards in a stream.
     * @param {ListShardsRequest} request - The request object that is passed to the API.
     * @returns ListShardsResponse
     */
    listShards(request: ListShardsRequest): ListShardsResponse {
        const res = this.RequestOperation(`ListShards`, request)
        return ListShardsResponse.fromJson(res.json())
    }


    /**
     * 
     * @param {GetShardIteratorRequest} request - GetShardIteratorRequest
     * @returns GetShardIteratorResponse
     */
    getShardIterator(request: GetShardIteratorRequest): GetShardIteratorResponse {
        const res = this.RequestOperation(`GetShardIterator`, request)
        return GetShardIteratorResponse.fromJson(res.json())
    }
}

/* Defining the interface for the CreateStreamRequest. */
export interface CreateStreamRequest {
    ShardCount?: number,
    StreamModeDetails?: {
        StreamMode: 'PROVISIONED' | 'ON_DEMAND'
    },
    StreamName: string
}


/* Defining the interface for the DeleteStreamRequest. */
export interface DeleteStreamRequest {
    EnforceConsumerDeletion: boolean,
    StreamARN: string,
    StreamName: string
}


export interface ListStreamRequest {
    ExclusiveStartStreamName: string,
    Limit: number,
    NextToken: string
}

export class StreamSummary {
    StreamARN: string;
    StreamCreationTimestamp: number;
    StreamModeDetails: {
        StreamMode: string;
    };
    StreamName: string;
    StreamStatus: string;

    constructor(
        StreamARN: string,
        StreamCreationTimestamp: number,
        StreamMode: string,
        StreamName: string,
        StreamStatus: string,
    ) {
        this.StreamARN = StreamARN;
        this.StreamCreationTimestamp = StreamCreationTimestamp;
        this.StreamModeDetails = { StreamMode };
        this.StreamName = StreamName;
        this.StreamStatus = StreamStatus;
    }

    static fromJson(summary: any): StreamSummary {
        return new StreamSummary(
            summary.StreamARN as string,
            summary.StreamCreationTimestamp as number,
            (summary.StreamModeDetails as JSONObject).streammode as string,
            summary.StreamName as string,
            summary.StreamStatus as string,
        )
    }
}

export class ListStreamsResponse {
    HasMoreStreams: boolean;
    NextToken?: string;
    StreamNames: string[];
    StreamSummaries: StreamSummary[];

    constructor(
        HasMoreStreams: boolean,
        NextToken: string,
        StreamNames: string[],
        StreamSummaries: StreamSummary[]
    ) {
        this.HasMoreStreams = HasMoreStreams;
        this.NextToken = NextToken;
        this.StreamNames = StreamNames;
        this.StreamSummaries = StreamSummaries
    }

    static fromJson(result: any): ListStreamsResponse {
        let response = new ListStreamsResponse(
            result.HasMoreStreams as boolean,
            result.NextToken ? result.NextToken as string : "",
            result.StreamNames ? (result.StreamNames as JSONArray).map(s => String(s)) : [],
            result.StreamSummaries ? (result.StreamSummaries as JSONArray).map(s => StreamSummary.fromJson(s)) : []
        )

        return response
    }
}

// Request class for PutRecords API
export interface PutRecordsRequest {
    Records: PutRecordsRequestRecord[];
    StreamName: string;
}

export interface PutRecordsRequestRecord {
    Data: string | ArrayBuffer;
    PartitionKey: string;
}


// Response class for PutRecords API
export class PutRecordsResponse {
    FailedRecordCount: number;
    Records: PutRecordsResponseRecord[];

    constructor(failedRecordCount: number, records: PutRecordsResponseRecord[]) {
        this.FailedRecordCount = failedRecordCount;
        this.Records = records;
    }

    static fromJson(json: any): PutRecordsResponse {
        const failedRecordCount = json.FailedRecordCount;
        const records = json.Records.map(record => PutRecordsResponseRecord.fromJson(record));
        return new PutRecordsResponse(failedRecordCount, records);
    }
}

export class PutRecordsResponseRecord {
    SequenceNumber: string;
    ShardId: string;

    constructor(sequenceNumber: string, shardId: string) {
        this.SequenceNumber = sequenceNumber;
        this.ShardId = shardId;
    }

    static fromJson(json: any): PutRecordsResponseRecord {
        return new PutRecordsResponseRecord(json.SequenceNumber, json.ShardId);
    }
}


// Request class for GetRecords API
export interface GetRecordsRequest {
    ShardIterator: string;
    Limit?: number;
}

// Response class for GetRecords API
export class GetRecordsResponse {
    NextShardIterator: string;
    Records: GetRecordsResponseRecord[];

    constructor(nextShardIterator: string, records: GetRecordsResponseRecord[]) {
        this.NextShardIterator = nextShardIterator;
        this.Records = records;
    }

    static fromJson(json: any): GetRecordsResponse {
        const nextShardIterator = json.NextShardIterator;
        const records = json.Records.map(record => GetRecordsResponseRecord.fromJson(record));
        return new GetRecordsResponse(nextShardIterator, records);
    }
}

class GetRecordsResponseRecord {
    Data: string | ArrayBuffer;
    PartitionKey: string;
    SequenceNumber: string;

    constructor(data: string | ArrayBuffer, partitionKey: string, sequenceNumber: string) {
        this.Data = data;
        this.PartitionKey = partitionKey;
        this.SequenceNumber = sequenceNumber;
    }

    static fromJson(json: any): GetRecordsResponseRecord {
        return new GetRecordsResponseRecord(json.Data, json.PartitionKey, json.SequenceNumber);
    }
}

// Request class for ListShards API
interface ListShardsRequest {
    StreamName: string;
    NextToken: string;
    MaxResults: number;
}

// Response class for ListShards API
export class ListShardsResponse {
    Shards: ListShardsResponseShard[];
    NextToken?: string;

    constructor(shards: ListShardsResponseShard[], nextToken?: string) {
        this.Shards = shards;
        this.NextToken = nextToken;
    }

    static fromJson(json: any): ListShardsResponse {
        const shards = json.Shards.map(shard => ListShardsResponseShard.fromJson(shard));
        const nextToken = json.NextToken;
        return new ListShardsResponse(shards, nextToken);
    }
}

export class ListShardsResponseShard {
    ShardId: string;
    ParentShardId?: string;
    AdjacentParentShardId?: string;
    HashKeyRange: {
        StartingHashKey: string;
        EndingHashKey: string;
    };
    SequenceNumberRange: {
        StartingSequenceNumber: string;
        EndingSequenceNumber?: string;
    };

    constructor(
        shardId: string,
        hashKeyRange: { StartingHashKey: string; EndingHashKey: string },
        sequenceNumberRange: { StartingSequenceNumber: string; EndingSequenceNumber?: string },
        parentShardId?: string,
        adjacentParentShardId?: string
    ) {
        this.ShardId = shardId;
        this.ParentShardId = parentShardId;
        this.AdjacentParentShardId = adjacentParentShardId;
        this.HashKeyRange = hashKeyRange;
        this.SequenceNumberRange = sequenceNumberRange;
    }

    static fromJson(json: any): ListShardsResponseShard {
        return new ListShardsResponseShard(
            json.ShardId,
            json.HashKeyRange,
            json.SequenceNumberRange,
            json.ParentShardId,
            json.AdjacentParentShardId
        );
    }
}

interface GetShardIteratorRequest {
    StreamName: string;
    ShardId: string;
    ShardIteratorType: 'AT_SEQUENCE_NUMBER' | 'AFTER_SEQUENCE_NUMBER' | 'TRIM_HORIZON' | 'LATEST' | 'AT_TIMESTAMP';
    StartingSequenceNumber?: string;
    Timestamp?: number;
}

class GetShardIteratorResponse {
    ShardIterator: string;

    constructor(shardIterator: string) {
        this.ShardIterator = shardIterator;
    }

    static fromJson(json: any): GetShardIteratorResponse {
        return new GetShardIteratorResponse(json.ShardIterator);
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

const hasKey = <T extends object>(obj: T, k: keyof any): k is keyof T =>
    k in obj;