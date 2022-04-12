import http from 'k6/http'
import { parseHTML } from 'k6/html'
import { sha256 } from 'k6/crypto'

import { signHeaders, InvalidSignatureError, URIEncodingConfig, toTime } from './signature.js'
import { AWSError } from './error.js'
import { AWSConfig } from './config.js'

/** Class allowing to interact with Amazon AWS's S3 service */
export class S3Client {
    /**
     * Create a S3Client
     *
     * @param {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
     */
    constructor(awsConfig) {
        this.awsConfig = awsConfig
        this.serviceName = 's3'
        this.URIencodingConfig = new URIEncodingConfig(false, true)

        // TODO: define host getter
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
    listBuckets() {
        // Prepare request
        const method = 'GET'
        const host = `${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const body = ''
        const { url, headers } = this._buildRequest(method, host, '/', '', body, {})

        const res = http.request(method, url, body, { headers: headers })
        this._handle_error(res.error_code, res.error, res.body)

        let buckets = []

        const doc = parseHTML(res.body)

        doc.find('Buckets')
            .children()
            .each((_, bucketDefinition) => {
                let bucket = new S3Bucket()

                bucketDefinition.children().forEach((child) => {
                    switch (child.nodeName()) {
                        case 'name':
                            Object.assign(bucket, { name: child.textContent() })
                        case 'creationdate':
                            const parsed = Date.parse(
                                child.textContent(),
                                'YYYY-MM-ddTHH:mm:ss.sssZ'
                            )
                            Object.assign(bucket, { creationDate: parsed })
                    }
                })

                buckets.push(bucket)
            })

        return buckets
    }

    /**
     * Returns some or all (up to 1,000) of the objects in a bucket.
     *
     * @param  {string} bucketName - Bucket name to list.
     * @param  {string} prefix='' - Limits the response to keys that begin with the specified prefix.
     * @return {Array.<S3Object>} - returns an array of objects describing S3 objects
     *     with the following fields: key, lastModified, etag, size and storageClass.
     * @throws  {S3ServiceError}
     * @throws  {InvalidSignatureError}
     */
    listObjects(bucketName, prefix = '') {
        // Prepare request
        const method = 'GET'
        const host = `${bucketName}.${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const body = ''
        const { url, headers } = this._buildRequest(method, host, '/', 'list-type=2', body, {})

        const res = http.request(method, url, body, { headers: headers })
        this._handle_error(res.error_code, res.error, res.body)

        let objects = []

        // Extract the objects definition from
        // the XML response
        parseHTML(res.body)
            .find('Contents')
            .each((_, objectDefinition) => {
                let obj = new S3Object()

                objectDefinition.children().forEach((child) => {
                    switch (child.nodeName()) {
                        case 'key':
                            Object.assign(obj, { key: child.textContent() })
                        case 'lastmodified':
                            const parsed = Date.parse(
                                child.textContent(),
                                'YYYY-MM-ddTHH:mm:ss.sssZ'
                            )
                            Object.assign(obj, { lastModified: parsed })
                        case 'etag':
                            Object.assign(obj, { etag: child.textContent() })
                        case 'size':
                            Object.assign(obj, { size: parseInt(child.textContent()) })
                        case 'storageclass':
                            Object.assign(obj, { storageClass: child.textContent() })
                    }
                })

                objects.push(obj)
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
    getObject(bucketName, objectKey) {
        // Prepare request
        const method = 'GET'
        const host = `${bucketName}.${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const path = `/${objectKey}`
        const body = ''
        const { url, headers } = this._buildRequest(method, host, path, '', body, {})

        const res = http.request(method, url, body, { headers: headers })
        this._handle_error(res.error_code, res.error, res.body)

        return new S3Object(
            objectKey,
            res.headers['Last-Modified'],
            res.headers['ETag'],
            res.headers['Content-Length'],
            '', // GetObject response doesn't contain the storage class
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
    putObject(bucketName, objectKey, data) {
        // Prepare request
        const method = 'PUT'
        const host = `${bucketName}.${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const path = `/${objectKey}`
        const queryString = ''
        const body = data
        const { url, headers } = this._buildRequest(method, host, path, queryString, body, {})

        const res = http.request(method, url, body, { headers: headers })
        this._handle_error(res.error_code, res.error, res.body)
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
    deleteObject(bucketName, objectKey) {
        // Prepare request
        const method = 'DELETE'
        const host = `${bucketName}.${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
        const path = `/${objectKey}`
        const queryString = ''
        const body = ''
        const { url, headers } = this._buildRequest(method, host, path, queryString, body, {})

        const res = http.request(method, url, body, { headers: headers })
        this._handle_error(res.error_code, res.error, res.body)
    }

    _buildRequest(method, host, path, queryString, body, headers) {
        const requestTimestamp = Date.now()
        const date = toTime(requestTimestamp)

        headers['Host'] = host
        headers['X-Amz-Date'] = date
        headers['X-Amz-Content-SHA256'] = sha256(body, 'hex')

        headers = signHeaders(
            // headers
            headers,

            // requestTimestamp
            requestTimestamp,

            // method
            method,

            // path
            path,

            // querystring
            queryString,

            // body
            body,

            // AWS configuration
            this.awsConfig,

            // AwS target service name
            this.serviceName,

            // doubleEncoding: S3 does single-encoding of the uri component
            // pathURIEncoding: S3 manipulates object keys, and forward slashes
            // shouldn't be URI encoded
            this.URIencodingConfig
        )

        // '?' should not be part of the querystring when we sign the headers
        path = path !== '' ? path : '/'
        let url = `https://${host}${path}`
        if (queryString !== '') {
            url += `?${queryString}`
        }

        return { url: url, headers: headers }
    }

    // FIXME: remove dependency to `error_message`
    // FIXME: just pass it the response?
    _handle_error(error_code, error_message, error_body) {
        if (error_message == '' || error_code === 0) {
            return
        }

        // FIXME: should be error_code === 1301 instead
        // See: https://github.com/grafana/k6/issues/2474
        // See: https://github.com/golang/go/issues/49281
        if (error_message && error_message.startsWith('301')) {
            console.log('HERE')
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

/** Class representing a S3 Bucket */
export class S3Bucket {
    /**
     * Create an S3 Bucket
     *
     * @param  {string} name - S3 bucket's name
     * @param  {Date} creationDate - S3 bucket's creation date
     */
    constructor(name, creationDate) {
        this.name = name
        this.creationDate = creationDate
    }
}

/** Class representing an S3 Object */
export class S3Object {
    /**
     * Create an S3 Object
     *
     * @param  {string} key - S3 object's key
     * @param  {Date} lastModified - S3 object last modification date
     * @param  {string} etag - S3 object's etag
     * @param  {number} size - S3 object's size
     * @param  {string} storageClass - S3 object's storage class
     * @param  {string} data=null - S3 Object's data
     */
    constructor(key, lastModified, etag, size, storageClass, data = null) {
        this.key = key
        this.lastModified = lastModified
        this.etag = etag
        this.size = size
        this.storageClass = storageClass || ''
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
    /**
     * Constructs a S3ServiceError
     *
     * @param  {string} message - human readable error message
     * @param  {string} code - A unique short code representing the error that was emitted
     * @param  {string} operation - Name of the failed Operation
     */
    constructor(message, code, operation) {
        super(message, code)
        this.name = 'S3ServiceError'
        this.operation = operation
    }
}
