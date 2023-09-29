import { AWSConfig } from './config'
import { Endpoint } from './endpoint'
import { HTTPHeaders } from './http'

/**
 * Class allowing to build requests targeting AWS APIs
 *
 * This class is meant to be used as a base class for specific
 * services clients. See S3Client or SecretsManagerClient for
 * usage examples.
 */
export class AWSClient {
    awsConfig: AWSConfig
    serviceName: string

    private _endpoint?: Endpoint

    /**
     * @param {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
     * @param  {string} serviceName - name of the service to target.
     * @param  {URIEncodingConfig} URIencodingConfig - configures how requests URIs should be encoded.
     */
    constructor(awsConfig: AWSConfig, serviceName: string) {
        this.awsConfig = awsConfig
        this.serviceName = serviceName

        // If an endpoint is provided in the config, set it
        // to ensure the default endpoint is not used.
        if (awsConfig.endpoint != undefined) {
            this._endpoint = awsConfig.endpoint
        }
    }

    /**
     * Represents the endpoint URL of the AWS service.
     *
     * If no custom endpoint is set, a default endpoint will be constructed
     * using the service name and region provided in the AWS config.
     *
     * @type {Endpoint}
     * @public
     */
    public get endpoint() {
        if (this._endpoint == undefined) {
            this._endpoint = new Endpoint(
                `https://${this.serviceName}.${this.awsConfig.region}.amazonaws.com`
            )
        }
        return this._endpoint
    }

    /**
     * Updates the endpoint URL of the AWS service.
     *
     * This can be used to override the default AWS service endpoint or set a custom endpoint.
     *
     * @param {Endpoint} endpoint - The new endpoint to set for the AWS service.
     * @public
     */
    public set endpoint(endpoint: Endpoint) {
        this._endpoint = endpoint
    }
}

/**
 * Type alias representing the result of an AWSClient.buildRequest call
 */
export interface AWSRequest {
    url: string
    headers: HTTPHeaders
}
