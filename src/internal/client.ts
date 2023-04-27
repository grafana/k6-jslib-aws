import { AWSConfig } from './config'
import { HTTPHeaders } from './http'
import { HTTPScheme } from './http'
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

    private _host?: string
    private _scheme?: HTTPScheme
    /**
     * @param {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
     * @param  {string} serviceName - name of the service to target.
     * @param  {URIEncodingConfig} URIencodingConfig - configures how requests URIs should be encoded.
     */
    constructor(awsConfig: AWSConfig, serviceName: string) {
        this.awsConfig = awsConfig
        this.serviceName = serviceName
    }

    /**
     * Property computing the URL to send the requests to when interacting with
     * the specific AWS service the child class implements the functionalities of.
     */
    public get host() {
        if (this._host == undefined) {
          this._host = `${this.serviceName}.${this.awsConfig.region}.${this.awsConfig.endpoint}`
        }
        return this._host
    }

    public set host(host: string) {
        this._host = host
    }

      /**
     * Property computing the scheme to use http or https. Defaults to https as per AWSConfig Defaults
     * the specific AWS service the child class implements the functionalities of.
     */
  
    public get scheme() {

      if (this._scheme == undefined) {
        this._scheme = this.awsConfig.scheme;
      }
      return this._scheme
    }
  
    // Validatiuon should be done by the type declaration 
    public set scheme(scheme: HTTPScheme) {
      this._scheme = scheme
  }

}

/**
 * Type alias representing the result of an AWSClient.buildRequest call
 */
export interface AWSRequest {
    url: string
    headers: HTTPHeaders
}
