import { bytes } from 'k6'
import http from 'k6/http'
import { parseHTML } from 'k6/html'
import { sha256 } from 'k6/crypto'

import { InvalidSignatureError, URIEncodingConfig } from './signature'
import { AWSClient, AWSRequest } from './client'
import { AWSError } from './error'
import { AWSConfig } from './config'

/** Class allowing to interact with Amazon AWS's S3 service */
export class S3Client extends AWSClient {
    /**
     * Create a S3Client
     *
     * @param {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
     */
    constructor(awsConfig: AWSConfig) {
        const URIencodingConfig = new URIEncodingConfig(false, true)
        super(awsConfig, 's3', URIencodingConfig)
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
    listBuckets(): Array<S3Bucket> {
        // Prepare request
        const method = 'GET'
        const host = `${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const body = ''
        const signedRequest: AWSRequest = super.buildRequest(method, host, '/', '', body, {
            'X-Amz-Content-SHA256': sha256(body, 'hex'),
        })

        const res = http.request(method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error(res.error_code, res.error, res.body as string)

        let buckets: Array<S3Bucket> = []

        const doc = parseHTML(res.body as string)

        doc.find('Buckets')
            .children()
            .each((_, bucketDefinition) => {
                let bucket = {}

                bucketDefinition.children().forEach((child) => {
                    switch (child.nodeName()) {
                        case 'name':
                            Object.assign(bucket, { name: child.textContent() })
                            break
                        case 'creationdate':
                            Object.assign(bucket, {
                                creationDate: Date.parse(child.textContent()),
                            })
                    }
                })

                buckets.push(bucket as S3Bucket)
            })

        return buckets
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
    listObjects(bucketName: string, prefix?: string): Array<S3Object> {
        // Prepare request
        const method = 'GET'
        const host = `${bucketName}.${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const body = ''
        const signedRequest: AWSRequest = super.buildRequest(
            method,
            host,
            '/',
            'list-type=2',
            body,
            {
                'X-Amz-Content-SHA256': sha256(body, 'hex'),
            }
        )

        const res = http.request(method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error(res.error_code, res.error, res.body as string)

        let objects: Array<S3Object> = []

        // Extract the objects definition from
        // the XML response
        parseHTML(res.body as string)
            .find('Contents')
            .each((_, objectDefinition) => {
                let obj = {}

                objectDefinition.children().forEach((child) => {
                    switch (child.nodeName()) {
                        case 'key':
                            Object.assign(obj, { key: child.textContent() })
                            break
                        case 'lastmodified':
                            // const parsed = Date.parse(
                            //     child.textContent(),
                            //     'YYYY-MM-ddTHH:mm:ss.sssZ'
                            // )
                            Object.assign(obj, { lastModified: Date.parse(child.textContent()) })
                            break
                        case 'etag':
                            Object.assign(obj, { etag: child.textContent() })
                            break
                        case 'size':
                            Object.assign(obj, { size: parseInt(child.textContent()) })
                            break
                        case 'storageclass':
                            Object.assign(obj, { storageClass: child.textContent() })
                    }
                })

                objects.push(obj as S3Object)
            })

        return objects
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
    getObject(bucketName: string, objectKey: string): S3Object {
        // Prepare request
        const method = 'GET'
        const host = `${bucketName}.${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const path = `/${objectKey}`
        const body = ''
        const signedRequest: AWSRequest = super.buildRequest(method, host, path, '', body, {
            'X-Amz-Content-SHA256': sha256(body, 'hex'),
        })

        const res = http.request(method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error(res.error_code, res.error, res.body as string)

        return new S3Object(
            objectKey,
            Date.parse(res.headers['Last-Modified']),
            res.headers['ETag'],
            parseInt(res.headers['Content-Length']),
            undefined, // GetObject response doesn't contain the storage class
            res.body
        )
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
    putObject(bucketName: string, objectKey: string, data: string | ArrayBuffer) {
        // Prepare request
        const method = 'PUT'
        const host = `${bucketName}.${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const path = `/${objectKey}`
        const queryString = ''
        const body = data
        const signedRequest: AWSRequest = super.buildRequest(
            method,
            host,
            path,
            queryString,
            body,
            {
                'X-Amz-Content-SHA256': sha256(body, 'hex'),
            }
        )

        const res = http.request(method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error(res.error_code, res.error, res.body as string)
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
    deleteObject(bucketName: string, objectKey: string): void {
        // Prepare request
        const method = 'DELETE'
        const host = `${bucketName}.${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const path = `/${objectKey}`
        const queryString = ''
        const body = ''
        const signedRequest: AWSRequest = super.buildRequest(
            method,
            host,
            path,
            queryString,
            body,
            {
                'X-Amz-Content-SHA256': sha256(body, 'hex'),
            }
        )

        const res = http.request(method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error(res.error_code, res.error, res.body as string)
    }

    // FIXME: remove dependency to `error_message`
    // FIXME: just pass it the response?
    _handle_error(error_code: number, error_message: string, error_body: string) {
        if (error_message == '' || error_code === 0) {
            return
        }

        // FIXME: should be error_code === 1301 instead
        // See: https://github.com/grafana/k6/issues/2474
        // See: https://github.com/golang/go/issues/49281
        if (error_message && error_message.startsWith('301')) {
            // Bucket not found
            throw new S3ServiceError('Resource not found', 'ResourceNotFound', 'getObject')
        }

        const awsError = AWSError.parseXML(error_body)
        switch (awsError.code) {
            case 'AuthorizationHeaderMalformed':
                throw new InvalidSignatureError(awsError.message, awsError.code)
            default:
                throw new S3ServiceError(awsError.message, awsError.code, 'listObjects')
        }
    }
}

// TODO: use interface instead?
/** Class representing a S3 Bucket */
export class S3Bucket {
    name: string
    creationDate: Date

    /**
     * Create an S3 Bucket
     *
     * @param  {string} name - S3 bucket's name
     * @param  {Date} creationDate - S3 bucket's creation date
     */
    constructor(name: string, creationDate: Date) {
        this.name = name
        this.creationDate = creationDate
    }
}

// TODO: use interface instead?
/** Class representing an S3 Object */
export class S3Object {
    key: string
    lastModified: number
    etag: string
    size: number
    storageClass: StorageClass
    data?: string | bytes | null

    /**
     * Create an S3 Object
     *
     * @param  {string} key - S3 object's key
     * @param  {Date} lastModified - S3 object last modification date
     * @param  {string} etag - S3 object's etag
     * @param  {number} size - S3 object's size
     * @param  {StorageClass} storageClass - S3 object's storage class
     * @param  {string | bytes | null} data=null - S3 Object's data
     */
    constructor(
        key: string,
        lastModified: number,
        etag: string,
        size: number,
        storageClass: StorageClass,
        data?: string | bytes | null
    ) {
        this.key = key
        this.lastModified = lastModified
        this.etag = etag
        this.size = size
        this.storageClass = storageClass
        this.data = data
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
    operation: string

    /**
     * Constructs a S3ServiceError
     *
     * @param  {string} message - human readable error message
     * @param  {string} code - A unique short code representing the error that was emitted
     * @param  {string} operation - Name of the failed Operation
     */
    constructor(message: string, code: string, operation: string) {
        super(message, code)
        this.name = 'S3ServiceError'
        this.operation = operation
    }
}

/**
 * Describes the class of storage used to store a S3 object.
 */
type StorageClass =
    | 'STANDARD'
    | 'REDUCED_REDUNDANCY'
    | 'GLACIER'
    | 'STANDARD_IA'
    | 'INTELLIGENT_TIERING'
    | 'DEEP_ARCHIVE'
    | 'OUTPOSTS'
    | 'GLACIER_IR'
    | undefined
