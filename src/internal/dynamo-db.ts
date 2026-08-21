import http, { RefinedResponse, ResponseType } from "k6/http";

import { AWSClient } from "./client.ts";
import { AWSConfig } from "./config.ts";
import { InvalidSignatureError, SignatureV4 } from "./signature.ts";
import { HTTPHeaders } from "./http.ts";
import { AWSError } from "./error.ts";
import { AMZ_TARGET_HEADER } from "./constants.ts";
import { JSONObject } from "./json.ts";

/**
 * Class allowing to interact with Amazon AWS's DynamoDB service.
 *
 * Table lifecycle (creation, deletion, etc.) is intentionally not covered:
 * this client only exposes the item-level operations a k6 load test would
 * exercise at runtime. Tables are expected to already exist.
 */
export class DynamoDBClient extends AWSClient {
  private readonly signature: SignatureV4;
  private readonly commonHeaders: HTTPHeaders;

  private readonly serviceVersion: string;

  constructor(awsConfig: AWSConfig) {
    super(awsConfig, "dynamodb");

    this.serviceVersion = "DynamoDB_20120810";

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
   * Creates a new item, or replaces an existing item with the same primary key.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
   * @param {string} tableName - The name of the table to put the item into.
   * @param {AttributeMap} item - The item to put, described using DynamoDB's typed AttributeValue map.
   * @param {PutItemOptions} [options={}] - Options for the request.
   * @returns {AttributeMap | undefined} - The item's previous attributes, if `options.returnValues` was set to `"ALL_OLD"`.
   */
  async putItem(
    tableName: string,
    item: AttributeMap,
    options: PutItemOptions = {},
  ): Promise<AttributeMap | undefined> {
    let body: Record<string, unknown> = { TableName: tableName, Item: item };

    body = this._withConditionalWriteOptions(body, options);

    const res = await this._sendRequest("PutItem", body);

    const parsed = res.json() as JSONObject;
    return parsed["Attributes"] as unknown as AttributeMap | undefined;
  }

  /**
   * Retrieves a single item from a table by its primary key.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html
   * @param {string} tableName - The name of the table to read from.
   * @param {AttributeMap} key - The primary key of the item to retrieve.
   * @param {GetItemOptions} [options={}] - Options for the request.
   * @returns {AttributeMap | undefined} - The requested item, or `undefined` if it does not exist.
   */
  async getItem(
    tableName: string,
    key: AttributeMap,
    options: GetItemOptions = {},
  ): Promise<AttributeMap | undefined> {
    let body: Record<string, unknown> = { TableName: tableName, Key: key };

    if (typeof options.consistentRead !== "undefined") {
      body = { ...body, ConsistentRead: options.consistentRead };
    }
    if (typeof options.projectionExpression !== "undefined") {
      body = { ...body, ProjectionExpression: options.projectionExpression };
    }
    if (typeof options.expressionAttributeNames !== "undefined") {
      body = {
        ...body,
        ExpressionAttributeNames: options.expressionAttributeNames,
      };
    }

    const res = await this._sendRequest("GetItem", body);

    const parsed = res.json() as JSONObject;
    return parsed["Item"] as unknown as AttributeMap | undefined;
  }

  /**
   * Deletes a single item from a table by its primary key.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html
   * @param {string} tableName - The name of the table to delete from.
   * @param {AttributeMap} key - The primary key of the item to delete.
   * @param {DeleteItemOptions} [options={}] - Options for the request.
   * @returns {AttributeMap | undefined} - The item's attributes as they were before deletion, if `options.returnValues` was set to `"ALL_OLD"`.
   */
  async deleteItem(
    tableName: string,
    key: AttributeMap,
    options: DeleteItemOptions = {},
  ): Promise<AttributeMap | undefined> {
    let body: Record<string, unknown> = { TableName: tableName, Key: key };

    body = this._withConditionalWriteOptions(body, options);

    const res = await this._sendRequest("DeleteItem", body);

    const parsed = res.json() as JSONObject;
    return parsed["Attributes"] as unknown as AttributeMap | undefined;
  }

  /**
   * Edits an existing item's attributes, or creates a new item if it does not already exist.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
   * @param {string} tableName - The name of the table containing the item to update.
   * @param {AttributeMap} key - The primary key of the item to update.
   * @param {string} updateExpression - An expression that defines one or more attributes to be updated.
   * @param {UpdateItemOptions} [options={}] - Options for the request.
   * @returns {AttributeMap | undefined} - The item's attributes, in the form specified by `options.returnValues`.
   */
  async updateItem(
    tableName: string,
    key: AttributeMap,
    updateExpression: string,
    options: UpdateItemOptions = {},
  ): Promise<AttributeMap | undefined> {
    let body: Record<string, unknown> = {
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
    };

    body = this._withConditionalWriteOptions(body, options);

    const res = await this._sendRequest("UpdateItem", body);

    const parsed = res.json() as JSONObject;
    return parsed["Attributes"] as unknown as AttributeMap | undefined;
  }

  /**
   * Finds items in a table or a secondary index using the partition key and, optionally, the sort key.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
   * @param {string} tableName - The name of the table to query.
   * @param {string} keyConditionExpression - The condition that specifies the key values for items to be retrieved.
   * @param {QueryOptions} [options={}] - Options for the request.
   * @returns {QueryResponse} - The matched items and pagination information.
   */
  async query(
    tableName: string,
    keyConditionExpression: string,
    options: QueryOptions = {},
  ): Promise<QueryResponse> {
    let body: Record<string, unknown> = {
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
    };

    body = this._withCommonQueryLikeOptions(body, options);

    if (typeof options.scanIndexForward !== "undefined") {
      body = { ...body, ScanIndexForward: options.scanIndexForward };
    }

    const res = await this._sendRequest("Query", body);
    return QueryResponse.fromJSON(res.json() as JSONObject);
  }

  /**
   * Returns one or more items and item attributes by accessing every item in a table or a secondary index.
   *
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
   * @param {string} tableName - The name of the table to scan.
   * @param {ScanOptions} [options={}] - Options for the request.
   * @returns {QueryResponse} - The matched items and pagination information.
   */
  async scan(
    tableName: string,
    options: ScanOptions = {},
  ): Promise<QueryResponse> {
    let body: Record<string, unknown> = { TableName: tableName };

    body = this._withCommonQueryLikeOptions(body, options);

    const res = await this._sendRequest("Scan", body);
    return QueryResponse.fromJSON(res.json() as JSONObject);
  }

  private _withConditionalWriteOptions(
    body: Record<string, unknown>,
    options: {
      conditionExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      expressionAttributeValues?: AttributeMap;
      returnValues?: ReturnValues;
    },
  ): Record<string, unknown> {
    if (typeof options.conditionExpression !== "undefined") {
      body = { ...body, ConditionExpression: options.conditionExpression };
    }
    if (typeof options.expressionAttributeNames !== "undefined") {
      body = {
        ...body,
        ExpressionAttributeNames: options.expressionAttributeNames,
      };
    }
    if (typeof options.expressionAttributeValues !== "undefined") {
      body = {
        ...body,
        ExpressionAttributeValues: options.expressionAttributeValues,
      };
    }
    if (typeof options.returnValues !== "undefined") {
      body = { ...body, ReturnValues: options.returnValues };
    }

    return body;
  }

  private _withCommonQueryLikeOptions(
    body: Record<string, unknown>,
    options: QueryOptions | ScanOptions,
  ): Record<string, unknown> {
    if (typeof options.consistentRead !== "undefined") {
      body = { ...body, ConsistentRead: options.consistentRead };
    }
    if (typeof options.expressionAttributeNames !== "undefined") {
      body = {
        ...body,
        ExpressionAttributeNames: options.expressionAttributeNames,
      };
    }
    if (typeof options.expressionAttributeValues !== "undefined") {
      body = {
        ...body,
        ExpressionAttributeValues: options.expressionAttributeValues,
      };
    }
    if (typeof options.filterExpression !== "undefined") {
      body = { ...body, FilterExpression: options.filterExpression };
    }
    if (typeof options.indexName !== "undefined") {
      body = { ...body, IndexName: options.indexName };
    }
    if (typeof options.limit !== "undefined") {
      body = { ...body, Limit: options.limit };
    }
    if (typeof options.exclusiveStartKey !== "undefined") {
      body = { ...body, ExclusiveStartKey: options.exclusiveStartKey };
    }

    return body;
  }

  private async _sendRequest(
    action: DynamoDBOperation,
    body: Record<string, unknown>,
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

    const errorCode: number = response.error_code;
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
      throw new DynamoDBServiceError(
        errorMessage,
        error.__type as string,
        operation as DynamoDBOperation,
      );
    }

    if (errorCode >= 1500 && errorCode <= 1599) {
      throw new DynamoDBServiceError(
        "An error occurred on the server side",
        "InternalServiceError",
        operation as DynamoDBOperation,
      );
    }

    return true;
  }
}

/**
 * A DynamoDB typed attribute value.
 *
 * Exactly one of these fields should be set, matching the AttributeValue
 * shape used by AWS's low-level DynamoDB API (e.g. `{ S: "foo" }`, `{ N: "1" }`).
 */
export interface AttributeValue {
  S?: string;
  N?: string;
  /** Base64-encoded binary data. */
  B?: string;
  SS?: string[];
  NS?: string[];
  /** Base64-encoded binary data, one entry per set member. */
  BS?: string[];
  M?: AttributeMap;
  L?: AttributeValue[];
  NULL?: boolean;
  BOOL?: boolean;
}

/**
 * A DynamoDB item, or a primary key: a map of attribute names to typed {@link AttributeValue}s.
 */
export type AttributeMap = Record<string, AttributeValue>;

/**
 * Determines which item attributes UpdateItem should return.
 */
export type ReturnValues =
  | "NONE"
  | "ALL_OLD"
  | "UPDATED_OLD"
  | "ALL_NEW"
  | "UPDATED_NEW";

/**
 * Determines which item attributes PutItem/DeleteItem should return.
 * Unlike UpdateItem, they only support returning the item's previous
 * attributes, or nothing.
 */
export type WriteReturnValues = "NONE" | "ALL_OLD";

export interface PutItemOptions {
  /**
   * A condition that must be satisfied for the PutItem operation to succeed.
   */
  conditionExpression?: string;
  /**
   * Substitution tokens for attribute names in an expression.
   */
  expressionAttributeNames?: Record<string, string>;
  /**
   * Substitution tokens for attribute values in an expression.
   */
  expressionAttributeValues?: AttributeMap;
  /**
   * Whether to return the item's previous attributes ("ALL_OLD") or nothing ("NONE", the default).
   */
  returnValues?: WriteReturnValues;
}

export interface GetItemOptions {
  /**
   * Whether to use strongly consistent reads instead of eventually consistent reads.
   */
  consistentRead?: boolean;
  /**
   * A string that identifies one or more attributes to retrieve from the table.
   */
  projectionExpression?: string;
  /**
   * Substitution tokens for attribute names in `projectionExpression`.
   */
  expressionAttributeNames?: Record<string, string>;
}

export interface DeleteItemOptions {
  /**
   * A condition that must be satisfied for the DeleteItem operation to succeed.
   */
  conditionExpression?: string;
  /**
   * Substitution tokens for attribute names in an expression.
   */
  expressionAttributeNames?: Record<string, string>;
  /**
   * Substitution tokens for attribute values in an expression.
   */
  expressionAttributeValues?: AttributeMap;
  /**
   * Whether to return the item's attributes as they were before deletion ("ALL_OLD") or nothing ("NONE", the default).
   */
  returnValues?: WriteReturnValues;
}

export interface UpdateItemOptions {
  /**
   * A condition that must be satisfied for the UpdateItem operation to succeed.
   */
  conditionExpression?: string;
  /**
   * Substitution tokens for attribute names in an expression.
   */
  expressionAttributeNames?: Record<string, string>;
  /**
   * Substitution tokens for attribute values in an expression.
   */
  expressionAttributeValues?: AttributeMap;
  /**
   * Which item attributes to return, in the form of a {@link ReturnValues}.
   */
  returnValues?: ReturnValues;
}

export interface QueryOptions {
  /**
   * Whether to use strongly consistent reads instead of eventually
   * consistent reads. Not supported when `indexName` is a global secondary
   * index.
   */
  consistentRead?: boolean;
  /**
   * Substitution tokens for attribute names in an expression.
   */
  expressionAttributeNames?: Record<string, string>;
  /**
   * Substitution tokens for attribute values in an expression.
   */
  expressionAttributeValues?: AttributeMap;
  /**
   * A condition applied after the Query operation, to filter results before they are returned.
   */
  filterExpression?: string;
  /**
   * The name of a secondary index to query instead of the base table.
   */
  indexName?: string;
  /**
   * The maximum number of items to evaluate.
   */
  limit?: number;
  /**
   * Whether to traverse the index in ascending ("true", the default) or descending ("false") order.
   */
  scanIndexForward?: boolean;
  /**
   * The primary key of the first item that this operation will evaluate, as returned in a previous response's `lastEvaluatedKey`.
   */
  exclusiveStartKey?: AttributeMap;
}

export interface ScanOptions {
  /**
   * Whether to use strongly consistent reads instead of eventually
   * consistent reads. Not supported when `indexName` is a global secondary
   * index.
   */
  consistentRead?: boolean;
  /**
   * Substitution tokens for attribute names in an expression.
   */
  expressionAttributeNames?: Record<string, string>;
  /**
   * Substitution tokens for attribute values in an expression.
   */
  expressionAttributeValues?: AttributeMap;
  /**
   * A condition applied after the Scan operation, to filter results before they are returned.
   */
  filterExpression?: string;
  /**
   * The name of a secondary index to scan instead of the base table.
   */
  indexName?: string;
  /**
   * The maximum number of items to evaluate.
   */
  limit?: number;
  /**
   * The primary key of the first item that this operation will evaluate, as returned in a previous response's `lastEvaluatedKey`.
   */
  exclusiveStartKey?: AttributeMap;
}

/**
 * The response format shared by the Query and Scan operations.
 */
export class QueryResponse {
  /**
   * The items matching the request.
   */
  items: AttributeMap[];

  /**
   * The number of items in the response.
   */
  count: number;

  /**
   * The number of items evaluated, before any `filterExpression` was applied.
   */
  scannedCount: number;

  /**
   * The primary key of the item where the operation stopped. Pass this value
   * as `exclusiveStartKey` in a subsequent request to continue the operation.
   * Absent once the operation has processed the last item.
   */
  lastEvaluatedKey?: AttributeMap;

  constructor(
    items: AttributeMap[],
    count: number,
    scannedCount: number,
    lastEvaluatedKey?: AttributeMap,
  ) {
    this.items = items;
    this.count = count;
    this.scannedCount = scannedCount;
    this.lastEvaluatedKey = lastEvaluatedKey;
  }

  static fromJSON(json: JSONObject): QueryResponse {
    const { Items = [], Count = 0, ScannedCount = 0, LastEvaluatedKey } = json;

    return new QueryResponse(
      Items as unknown as AttributeMap[],
      Count as number,
      ScannedCount as number,
      LastEvaluatedKey as unknown as AttributeMap | undefined,
    );
  }
}

/**
 * DynamoDBServiceError indicates an error occurred while interacting with the DynamoDB API.
 */
export class DynamoDBServiceError extends AWSError {
  operation: DynamoDBOperation;

  constructor(message: string, code: string, operation: DynamoDBOperation) {
    super(message, code);
    this.name = "DynamoDBServiceError";
    this.operation = operation;
  }
}

/**
 * DynamoDBOperation describes possible DynamoDB operations implemented by this client.
 */
type DynamoDBOperation =
  | "PutItem"
  | "GetItem"
  | "DeleteItem"
  | "UpdateItem"
  | "Query"
  | "Scan";
