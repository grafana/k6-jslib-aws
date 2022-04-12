import { signHeaders, toTime } from './signature.js'

/**
 * Class allowing to build requests targeting AWS APIs
 *
 * This class is meant to be used as a base class for specific
 * services clients. See S3Client or SecretsManagerClient for
 * usage examples.
 */
export class AWSClient {
    /**
     * @param {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
     * @param  {string} serviceName - name of the service to target.
     * @param  {URIEncodingConfig} URIencodingConfig - configures how requests URIs should be encoded.
     */
    constructor(awsConfig, serviceName, URIencodingConfig) {
        this.awsConfig = awsConfig
        this.serviceName = serviceName
        this.URIencodingConfig = URIencodingConfig
    }

    buildRequest(method, host, path, queryString, body, headers) {
        const requestTimestamp = Date.now()
        const date = toTime(requestTimestamp)

        headers['Host'] = host
        headers['X-Amz-Date'] = date

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
}
