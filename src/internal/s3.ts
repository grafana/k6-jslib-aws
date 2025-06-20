import { parseHTML } from "k6/html";
import http, { RefinedResponse, ResponseType } from "k6/http";

import { AWSClient } from "./client.ts";
import { AWSConfig } from "./config.ts";
import { AWSError } from "./error.ts";
import { SignedHTTPRequest } from "./http.ts";
import { InvalidSignatureError, SignatureV4 } from "./signature.ts";

/** Class allowing to interact with Amazon AWS's S3 service */
export class S3Client extends AWSClient {
  private readonly signature: SignatureV4;

  /**
   * Create a S3Client
   *
   * @param {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
   */
  constructor(awsConfig: AWSConfig) {
    super(awsConfig, "s3");

    this.signature = new SignatureV4({
      service: this.serviceName,
      region: this.awsConfig.region,
      credentials: {
        accessKeyId: this.awsConfig.accessKeyId,
        secretAccessKey: this.awsConfig.secretAccessKey,
        sessionToken: this.awsConfig.sessionToken,
      },

      // S3 requires the URI path to be escaped
      uriEscapePath: false,

      // Signing S3 requests requires the payload to be hashed
      // and the checksum to be included in the request headers.
      applyChecksum: true,
    });
  }

  /**
   * Returns a list of all buckets owned by the authenticated sender of the request.
   * To use this operation, you must have the s3:ListAllMyBuckets permission.
   *
   * @return  {Array.<S3Bucket>} buckets - An array of objects describing S3 buckets
   *     with the following fields: name, and creationDate.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async listBuckets(): Promise<Array<S3Bucket>> {
    const method = "GET";

    const signedRequest: SignedHTTPRequest = this.signature.sign(
      {
        method: "GET",
        endpoint: this.endpoint,
        path: "/",
        headers: {},
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body || null,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, "ListBuckets");

    const buckets: Array<S3Bucket> = [];

    const doc = parseHTML(res.body as string);

    doc.find("Buckets")
      .children()
      .each((_, bucketDefinition) => {
        const bucket = {};

        bucketDefinition.children().forEach((child) => {
          switch (child.nodeName()) {
            case "name":
              Object.assign(bucket, { name: child.textContent() });
              break;
            case "creationdate":
              Object.assign(bucket, {
                creationDate: Date.parse(child.textContent()),
              });
          }
        });

        buckets.push(bucket as S3Bucket);
      });

    return buckets;
  }

  /**
   * Returns some or all (up to 1,000) of the objects in a bucket.
   *
   * @param  {string} bucketName - Bucket name to list.
   * @param  {string?} prefix='' - Limits the response to keys that begin with the specified prefix.
   * @return {Array.<S3Object>} - returns an array of objects describing S3 objects
   *     with the following fields: key, lastModified, etag, size and storageClass.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async listObjects(
    bucketName: string,
    prefix?: string,
  ): Promise<Array<S3Object>> {
    const method = "GET";

    const signedRequest: SignedHTTPRequest = this.signature.sign(
      {
        method: method,
        endpoint: this.endpoint,
        path: encodeURI(`/${bucketName}/`),
        query: {
          "list-type": "2",
          prefix: prefix || "",
        },
        headers: {},
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body || null,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, "ListObjectsV2");

    const objects: Array<S3Object> = [];

    // Extract the objects definition from
    // the XML response
    parseHTML(res.body as string)
      .find("Contents")
      .each((_, objectDefinition) => {
        const obj = {};

        objectDefinition.children().forEach((child) => {
          switch (child.nodeName()) {
            case "key":
              Object.assign(obj, { key: child.textContent() });
              break;
            case "lastmodified":
              Object.assign(obj, {
                lastModified: Date.parse(child.textContent()),
              });
              break;
            case "etag":
              Object.assign(obj, { etag: child.textContent() });
              break;
            case "size":
              Object.assign(obj, { size: parseInt(child.textContent()) });
              break;
            case "storageclass":
              Object.assign(obj, { storageClass: child.textContent() });
          }
        });

        objects.push(obj as S3Object);
      });

    return objects;
  }
  /**
   * Retrieves an Object from Amazon S3.
   *
   * To use getObject, you must have `READ` access to the object.
   *
   * @param  {string} bucketName - The bucket name containing the object.
   * @param  {string} objectKey - Key of the object to get.
   * @return {S3Object} - returns the content of the fetched S3 Object.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async getObject(
    bucketName: string,
    objectKey: string,
    additionalHeaders: object = {},
  ): Promise<S3Object> {
    // Prepare request
    const method = "GET";

    const signedRequest = this.signature.sign(
      {
        method: method,
        endpoint: this.endpoint,
        path: encodeURI(`/${bucketName}/${objectKey}`),
        headers: {
          ...additionalHeaders,
        },
      },
      {},
    );

    // If the Accept header is set to 'application/octet-stream', we want to
    // return the response as binary data.
    let responseType: ResponseType = "text";
    if (
      "Accept" in additionalHeaders &&
      additionalHeaders["Accept"] !== undefined &&
      additionalHeaders["Accept"] === "application/octet-stream"
    ) {
      responseType = "binary";
    }

    const res = await http.asyncRequest(method, signedRequest.url, null, {
      ...this.baseRequestParams,
      headers: signedRequest.headers,
      responseType: responseType as ResponseType,
    });
    this.handleError(res, "GetObject");

    return new S3Object(
      objectKey,
      Date.parse(res.headers["Last-Modified"]),
      res.headers["ETag"],
      parseInt(res.headers["Content-Length"]),
      // The X-Amz-Storage-Class header is only set if the storage class is
      // not the default 'STANDARD' one.
      (res.headers["X-Amz-Storage-Class"] ?? "STANDARD") as StorageClass,
      res.body,
    );
  }
  /**
   * Adds an object to a bucket.
   *
   * You must have WRITE permissions on a bucket to add an object to it.
   *
   * @param  {string} bucketName - The bucket name containing the object.
   * @param  {string} objectKey - Key of the object to put.
   * @param  {string | ArrayBuffer} data - the content of the S3 Object to upload.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async putObject(
    bucketName: string,
    objectKey: string,
    data: string | ArrayBuffer,
    params?: PutObjectParams,
  ): Promise<S3UploadedObject> {
    // Prepare request
    const method = "PUT";

    const signedRequest = this.signature.sign(
      {
        method: method,
        endpoint: this.endpoint,
        path: encodeURI(`/${bucketName}/${objectKey}`),
        headers: {
          Host: this.endpoint.host,
          ...(params?.contentDisposition && {
            "Content-Disposition": params.contentDisposition,
          }),
          ...(params?.contentEncoding &&
            { "Content-Encoding": params.contentEncoding }),
          ...(params?.contentLength &&
            { "Content-Length": params.contentLength }),
          ...(params?.contentMD5 && { "Content-MD5": params.contentMD5 }),
          ...(params?.contentType && { "Content-Type": params.contentType }),
        },
        body: data,
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );

    this.handleError(res, "PutObject");

    return S3UploadedObject.fromResponse(res, objectKey);
  }

  /**
   * Removes the null version (if there is one) of an object and inserts a delete marker,
   * which becomes the latest version of the object.
   *
   * @param  {string} bucketName - The bucket name containing the object.
   * @param  {string} objectKey - Key of the object to delete.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async deleteObject(bucketName: string, objectKey: string): Promise<void> {
    // Prepare request
    const method = "DELETE";

    const signedRequest = this.signature.sign(
      {
        method: method,
        endpoint: this.endpoint,
        path: encodeURI(`/${bucketName}/${objectKey}`),
        headers: {},
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body || null,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, "DeleteObject");
  }

  /**
   * Copies an object from one bucket to another
   *
   * @param  {string} sourceBucket - The source bucket name containing the object.
   * @param  {string} sourceKey - Key of the source object to copy.
   * @param  {string} destinationBucket - The destination bucket name containing the object.
   * @param  {string} destinationKey - Key of the destination object.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async copyObject(
    sourceBucket: string,
    sourceKey: string,
    destinationBucket: string,
    destinationKey: string,
  ): Promise<void> {
    const method = "PUT";

    const bucketEndpoint = this.endpoint.copy();
    bucketEndpoint.hostname = `${destinationBucket}.${this.endpoint.hostname}`;

    const signedRequest = this.signature.sign(
      {
        method: method,
        endpoint: bucketEndpoint,
        path: encodeURI(`/${destinationKey}`),
        headers: {
          "x-amz-copy-source": `${sourceBucket}/${sourceKey}`,
        },
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body || null,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );

    this.handleError(res, "CopyObject");
  }

  /**
   * Creates a new multipart upload for a given objectKey.
   * The uploadId returned can be used to upload parts to the object.
   *
   * @param  {string} bucketName - The bucket name containing the object.
   * @param  {string} objectKey - Key of the object to upload.
   * @return {S3MultipartUpload} - returns the uploadId of the newly created multipart upload.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async createMultipartUpload(
    bucketName: string,
    objectKey: string,
  ): Promise<S3MultipartUpload> {
    const method = "POST";

    const bucketEndpoint = this.endpoint.copy();
    bucketEndpoint.hostname = `${bucketName}.${this.endpoint.hostname}`;

    const signedRequest = this.signature.sign(
      {
        method: method,
        endpoint: bucketEndpoint,
        path: encodeURI(`/${objectKey}`),
        headers: {},
        query: { uploads: "" },
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body || null,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, "CreateMultipartUpload");

    return new S3MultipartUpload(
      objectKey,
      parseHTML(res.body as string)
        .find("UploadId")
        .text(),
    );
  }

  /**
   * Uploads a part in a multipart upload.
   * @param {string} bucketName - The bucket name containing the object.
   * @param {string} objectKey - Key of the object to upload.
   * @param {string} uploadId - The uploadId of the multipart upload.
   * @param {number} partNumber - The part number of the part to upload.
   * @param {string | ArrayBuffer} data - The content of the part to upload.
   * @return {S3Part} - returns the ETag of the uploaded part.
   * @throws  {S3ServiceError}
   */
  async uploadPart(
    bucketName: string,
    objectKey: string,
    uploadId: string,
    partNumber: number,
    data: string | ArrayBuffer,
  ): Promise<S3Part> {
    const method = "PUT";

    const bucketEndpoint = this.endpoint.copy();
    bucketEndpoint.hostname = `${bucketName}.${this.endpoint.hostname}`;

    const signedRequest = this.signature.sign(
      {
        method: method,
        endpoint: bucketEndpoint,
        path: encodeURI(`/${objectKey}`),
        headers: {},
        body: data,
        query: {
          partNumber: `${partNumber}`,
          uploadId: `${uploadId}`,
        },
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body || null,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, "UploadPart");

    return new S3Part(partNumber, res.headers["Etag"]);
  }

  /**
   * Completes a multipart upload by assembling previously uploaded parts.
   *
   * @param  {string} bucketName - The bucket name containing the object.
   * @param  {string} objectKey - Key of the object to delete.
   * @param  {string} uploadId - The uploadId of the multipart upload to complete.
   * @param  {S3Part[]} parts - The parts to assemble.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async completeMultipartUpload(
    bucketName: string,
    objectKey: string,
    uploadId: string,
    parts: S3Part[],
  ) {
    // Prepare request
    const method = "POST";
    const body = `<CompleteMultipartUpload>${
      parts
        .map(
          (part) =>
            `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${part.eTag}</ETag></Part>`,
        )
        .join("")
    }</CompleteMultipartUpload>`;

    const bucketEndpoint = this.endpoint.copy();
    bucketEndpoint.hostname = `${bucketName}.${this.endpoint.hostname}`;

    const signedRequest = this.signature.sign(
      {
        method: method,
        endpoint: bucketEndpoint,
        path: encodeURI(`/${objectKey}`),
        headers: {},
        body: body,
        query: {
          uploadId: `${uploadId}`,
        },
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body || null,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, "CompleteMultipartUpload");
  }

  /**
   * Aborts a multipart upload.
   *
   * @param  {string} bucketName - The bucket name containing the object.
   * @param  {string} objectKey - Key of the object to delete.
   * @param  {string} uploadId - The uploadId of the multipart upload to abort.
   * @throws  {S3ServiceError}
   * @throws  {InvalidSignatureError}
   */
  async abortMultipartUpload(
    bucketName: string,
    objectKey: string,
    uploadId: string,
  ) {
    const method = "DELETE";

    const bucketEndpoint = this.endpoint.copy();
    bucketEndpoint.hostname = `${bucketName}.${this.endpoint.hostname}`;

    const signedRequest = this.signature.sign(
      {
        method: method,
        endpoint: bucketEndpoint,
        path: encodeURI(`/${objectKey}`),
        headers: {},
        query: {
          uploadId: `${uploadId}`,
        },
      },
      {},
    );

    const res = await http.asyncRequest(
      method,
      signedRequest.url,
      signedRequest.body || null,
      {
        ...this.baseRequestParams,
        headers: signedRequest.headers,
      },
    );
    this.handleError(res, "AbortMultipartUpload");
  }

  protected override handleError(
    response: RefinedResponse<ResponseType | undefined>,
    operation?: string,
  ): boolean {
    // As we are overriding the AWSClient method: call the parent class handleError method
    const errored = super.handleError(response);
    if (!errored) {
      return false;
    }

    // A 301 response is returned when the bucket is not found.
    // Generally meaning that either the bucket name is wrong or the
    // region is wrong.
    //
    // See: https://github.com/grafana/k6/issues/2474
    // See: https://github.com/golang/go/issues/49281
    const errorMessage: string = response.error;
    if (
      response.status == 301 || (errorMessage && errorMessage.startsWith("301"))
    ) {
      throw new S3ServiceError(
        "Resource not found",
        "ResourceNotFound",
        operation as S3Operation,
      );
    }

    const awsError = AWSError.parseXML(response.body as string);
    switch (awsError.code) {
      case "AuthorizationHeaderMalformed":
        throw new InvalidSignatureError(awsError.message, awsError.code);
      default:
        throw new S3ServiceError(
          awsError.message,
          awsError.code || "unknown",
          operation as S3Operation,
        );
    }
  }
}

/** Class representing a S3 Bucket */
export class S3Bucket {
  name: string;
  creationDate: Date;

  /**
   * Create an S3 Bucket
   *
   * @param  {string} name - S3 bucket's name
   * @param  {Date} creationDate - S3 bucket's creation date
   */
  constructor(name: string, creationDate: Date) {
    this.name = name;
    this.creationDate = creationDate;
  }
}

/** Class representing an S3 Object */
export class S3Object {
  key: string;
  lastModified: number;
  etag: string;
  size: number;
  storageClass: StorageClass;
  data?: string | ArrayBuffer | null;

  /**
   * Create an S3 Object
   *
   * @param  {string} key - S3 object's key
   * @param  {Date} lastModified - S3 object last modification date
   * @param  {string} etag - S3 object's etag
   * @param  {number} size - S3 object's size
   * @param  {StorageClass} storageClass - S3 object's storage class
   * @param  {string | ArrayBuffer | null} data=null - S3 Object's data
   */
  constructor(
    key: string,
    lastModified: number,
    etag: string,
    size: number,
    storageClass: StorageClass,
    data?: string | ArrayBuffer | null,
  ) {
    this.key = key;
    this.lastModified = lastModified;
    this.etag = etag;
    this.size = size;
    this.storageClass = storageClass;
    this.data = data;
  }
}

/**
 * Class representing an uploaded S3 Object, resulting from putObject operation.
 */
export class S3UploadedObject {
  key: string;

  /**
   * Entity tag for the uploaded object.
   *
   * General purpose buckets - To ensure that data is not corrupted traversing the network, for objects where the ETag is the MD5 digest of the object, you can calculate the MD5 while putting an object to Amazon S3 and compare the returned ETag to the calculated MD5 value.
   *
   * Directory buckets - The ETag for the object in a directory bucket isn't the MD5 digest of the object.
   */
  etag: string;

  /**
   * The Base64 encoded, 32-bit CRC32C checksum of the object. This checksum is only present if the checksum was uploaded with the object.
   */
  crc32?: string;

  /**
   * The Base64 encoded, 32-bit CRC32C checksum of the object. This checksum is only present if the checksum was uploaded with the object.
   */
  crc32c?: string;

  /**
   * The Base64 encoded, 64-bit CRC64NVME checksum of the object.
   *
   * This header is present if the object was uploaded with the CRC64NVME checksum algorithm, or if it was uploaded without a checksum.
   */
  crc64nvme?: string;

  /**
   * The Base64 encoded, 160-bit SHA1 digest of the object. This will only be present if the object was uploaded with the SHA1 checksum algorithm.
   */
  sha1?: string;

  /**
   * The Base64 encoded, 256-bit SHA256 digest of the object. This will only be present if the object was uploaded with the SHA256 checksum algorithm.
   */
  sha256?: string;

  /**
   * The type of checksum used to upload the object.
   */
  checksumType: S3ChecksumType;

  /**
   * The size of the object in bytes. The value is only present if you append to an object.
   */
  size?: number;

  constructor(
    key: string,
    etag: string,
    options?: {
      crc32?: string;
      crc32c?: string;
      crc64nvme?: string;
      sha1?: string;
      sha256?: string;
      checksumType?: S3ChecksumType;
      size?: number;
    },
  ) {
    this.key = key;
    this.etag = etag;
    this.crc32 = options?.crc32;
    this.crc32c = options?.crc32c;
    this.crc64nvme = options?.crc64nvme;
    this.sha1 = options?.sha1;
    this.sha256 = options?.sha256;
    this.checksumType = options?.checksumType || "FULL_OBJECT";
    this.size = options?.size;
  }

  /**
   * Creates an S3UploadedObject from a k6 HTTP response
   *
   * @param {RefinedResponse<ResponseType>} response - The HTTP response from a PutObject operation
   * @param {string} key - The key of the uploaded object
   * @returns {S3UploadedObject} A new S3UploadedObject instance
   */
  static fromResponse(
    response: RefinedResponse<ResponseType>,
    key: string,
  ): S3UploadedObject {
    const options: {
      crc32?: string;
      crc32c?: string;
      crc64nvme?: string;
      sha1?: string;
      sha256?: string;
      checksumType?: S3ChecksumType;
      size?: number;
    } = {};

    // Extract checksum values from headers
    if (response.headers["x-amz-checksum-crc32"]) {
      options.crc32 = response.headers["x-amz-checksum-crc32"];
    }

    if (response.headers["x-amz-checksum-crc32c"]) {
      options.crc32c = response.headers["x-amz-checksum-crc32c"];
    }

    if (response.headers["x-amz-checksum-crc64nvme"]) {
      options.crc64nvme = response.headers["x-amz-checksum-crc64nvme"];
    }

    if (response.headers["x-amz-checksum-sha1"]) {
      options.sha1 = response.headers["x-amz-checksum-sha1"];
    }

    if (response.headers["x-amz-checksum-sha256"]) {
      options.sha256 = response.headers["x-amz-checksum-sha256"];
    }

    // Extract checksum algorithm type
    if (response.headers["x-amz-checksum-algorithm"]) {
      options.checksumType =
        response.headers["x-amz-checksum-algorithm"] === "COMPOSITE"
          ? "COMPOSITE"
          : "FULL_OBJECT";
    }

    // Extract content length if available
    if (response.headers["x-amz-object-size"]) {
      options.size = parseInt(response.headers["x-amz-object-size"]);
    }

    // Get ETag from response headers
    const etag = response.headers["ETag"] || "";

    return new S3UploadedObject(key, etag, options);
  }
}

/** Class representing a S3 Multipart Upload */
export class S3MultipartUpload {
  key: string;
  uploadId: string;

  /**
   * Create an S3 Multipart Upload
   * @param  {string} key - S3 object's key
   * @param  {string} uploadId - S3 multipart upload id
   */

  constructor(key: string, uploadId: string) {
    this.key = key;
    this.uploadId = uploadId;
  }
}

/** Class representing a S3 Part */
export class S3Part {
  partNumber: number;
  eTag: string;

  /**
   * Create an S3 Part
   * @param  {number} partNumber - Part number
   * @param  {string} eTag - Part's etag
   */

  constructor(partNumber: number, eTag: string) {
    this.partNumber = partNumber;
    this.eTag = eTag;
  }
}

/**
 * Error indicating a S3 operation failed
 *
 * Inspired from AWS official error types, as
 * described in:
 *   * https://aws.amazon.com/blogs/developer/service-error-handling-modular-aws-sdk-js/
 *   * https://github.com/aws/aws-sdk-js/blob/master/lib/error.d.ts
 */
export class S3ServiceError extends AWSError {
  operation: string;

  /**
   * Constructs a S3ServiceError
   *
   * @param  {string} message - human readable error message
   * @param  {string} code - A unique short code representing the error that was emitted
   * @param  {string} operation - Name of the failed Operation
   */
  constructor(message: string, code: string, operation: string) {
    super(message, code);
    this.name = "S3ServiceError";
    this.operation = operation;
  }
}

/**
 * S3Operation describes possible values for S3 API operations,
 * as defined by AWS APIs.
 */
type S3Operation =
  | "ListBuckets"
  | "ListObjectsV2"
  | "GetObject"
  | "PutObject"
  | "DeleteObject"
  | "CopyObject"
  | "CreateMultipartUpload"
  | "CompleteMultipartUpload"
  | "UploadPart"
  | "AbortMultipartUpload";

/**
 * The type of checksum used to upload the object.
 */
type S3ChecksumType = "COMPOSITE" | "FULL_OBJECT";

/**
 * Describes the class of storage used to store a S3 object.
 */
type StorageClass =
  | "STANDARD"
  | "REDUCED_REDUNDANCY"
  | "GLACIER"
  | "STANDARD_IA"
  | "INTELLIGENT_TIERING"
  | "DEEP_ARCHIVE"
  | "OUTPOSTS"
  | "GLACIER_IR"
  | undefined;

/**
 * PutObjectParams describes the parameters that can be passed to the PutObject operation.
 */
export interface PutObjectParams {
  /**
   * Specifies presentational information for the object.
   *
   * For more information, see https://www.rfc-editor.org/rfc/rfc6266#section-4.
   */
  contentDisposition?: string;

  /**
   * Specifies what content encodings have been applied to the object and thus
   * what decoding mechanisms must be applied to obtain the media-type referenced
   * by the ContentType option.
   *
   * For more information, see https://www.rfc-editor.org/rfc/rfc9110.html#field.content-encoding.
   */
  contentEncoding?: string;

  /**
   * Size of the body in bytes. This parameter is useful when the size of the body cannot be
   * determined automatically.
   *
   * For more information, see https://www.rfc-editor.org/rfc/rfc9110.html#name-content-length.
   */
  contentLength?: string;

  /**
   * The base64-encoded 128-bit MD5 digest of the message (without the headers) according to RFC 1864.
   * This header can be used as a message integrity check to verify that the data is the same data that
   * was originally sent.
   *
   * Although it is optional, we recommend using the Content-MD5 mechanism as an end-to-end integrity
   * check.
   */
  contentMD5?: string;

  /**
   * A standard MIME type describing the format of the contents.
   *
   * For more information, see https://www.rfc-editor.org/rfc/rfc9110.html#name-content-type.
   */
  contentType?: string;
}
