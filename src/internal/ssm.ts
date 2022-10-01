import { JSONObject } from 'k6'
import http, { RefinedResponse, ResponseType } from 'k6/http'

import { AWSClient, AWSRequest } from './client'
import { AWSError } from './error'
import { AWSConfig } from './config'
import { InvalidSignatureError, URIEncodingConfig } from './signature'
import { HTTPMethod, HTTPHeaders } from './http'

/**
 * Class allowing to interact with Amazon AWS's Systems Manager service
 */
export class SystemsManagerClient extends AWSClient {
    method: HTTPMethod
    commonHeaders: HTTPHeaders

    /**
     * Create a SystemsManagerClient
     * @param  {AWSConfig} awsConfig - configuration attributes to use when interacting with AWS' APIs
     */
    constructor(awsConfig: AWSConfig) {
        const URIencodingConfig = new URIEncodingConfig(true, false)
        super(awsConfig, 'ssm', URIencodingConfig)

        // All interactions with the Systems Manager service
        // are made via the POST method.
        this.method = 'POST'
        this.commonHeaders = {
            'Accept-Encoding': 'identity',
            'Content-Type': 'application/x-amz-json-1.1',
        }
    }

    /**
     * Retrieves a parameter from Amazon Systems Manager
     *
     * @param {string} name - The ARN or name of the parameter to retrieve.
     * @param {boolean} withDecryption - whether returned secure string parameters should be decrypted.
     * @returns {SystemsManagerParameter} - returns the fetched Parameter object.
     * @throws {SystemsManagerServiceError}
     * @throws {InvalidSignatureError}
     */
    getParameter(
        name: string,
        withDecryption: boolean = false
    ): SystemsManagerParameter | undefined {
        const body = JSON.stringify({ Name: name, WithDecryption: withDecryption })

        // Ensure to include the desired 'Action' in the X-Amz-Target
        // header field, as documented by the AWS API docs.
        const signedRequest: AWSRequest = super.buildRequest(
            this.method,
            this.host,
            '/',
            '',
            body,
            {
                ...this.commonHeaders,
                'X-Amz-Target': `AmazonSSM.GetParameter`,
            }
        )

        const res = http.request(this.method, signedRequest.url, body, {
            headers: signedRequest.headers,
        })
        this._handle_error(SystemsManagerOperation.GetParameter, res);

        return SystemsManagerParameter.fromJSON(res.json() as JSONObject)
    }

    _handle_error(
        operation: SystemsManagerOperation,
        response: RefinedResponse<ResponseType | undefined>
    ) {
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
            throw new SystemsManagerServiceError(errorMessage, error.__type as string, operation)
        }

        if (errorCode === 1500) {
            throw new SystemsManagerServiceError(
                'An error occured on the server side',
                'InternalServiceError',
                operation
            )
        }
    }
}

/**
 * Class representing a Systems Manager's Parameter
 */
export class SystemsManagerParameter {
    parameter: SystemsManagerParameterItem

    /**
     * Constructs a Systems Manager's Parameter
     *
     * @param  {JSONObject} parameter - The response object content for the AWS System Manager.
     */
    constructor(parameter: JSONObject) {
        this.parameter = SystemsManagerParameterItem.fromJSON(parameter)
    }

    /**
     * Parses and constructs a Systems Manager's Parameter from the content
     * of a JSON response returned by the AWS service
     *
     * @param  {Object} json - JSON object as returned and parsed from
     *     the AWS service's API call.
     * @returns {SystemsManagerParameter}
     */
    static fromJSON(json: JSONObject): SystemsManagerParameter {
        return new SystemsManagerParameter(json.Parameter as JSONObject)
    }
}

/**
 * Class representing a Systems Manager's Parameter Object content
 */
class SystemsManagerParameterItem {
    arn: string
    dataType: string
    lastModifiedDate: number
    name: string
    selector: string
    sourceResult: string
    type: string
    value: string
    version: number

    /**
     * Constructs a Systems Manager's Parameter object contents
     *
     * @param  {string} arn - The Amazon Resource Name (ARN) of the parameter.
     * @param  {string} dataType - The data type of the parameter, such as text or aws:ec2:image. The default is text.
     * @param  {number} lastModifiedDate - Date the parameter was last changed or updated and the parameter version was created.
     * @param  {string} name - The friendly name of the parameter.
     * @param  {string} selector - Either the version number or the label used to retrieve the parameter value. Specify selectors by using one of the following formats:
     *  parameter_name:version
     *  parameter_name:label
     * @param  {string} sourceResult - Applies to parameters that reference information in other AWS services. SourceResult is the raw result or response from the source.
     * @param  {string} type - The type of parameter. Valid values include the following: String, StringList, and SecureString.
     * @param  {string} value - The parameter value.
     * @param  {number} version - The parameter version.
     */
    constructor(
        arn: string,
        dataType: string,
        lastModifiedDate: number,
        name: string,
        selector: string,
        sourceResult: string,
        type: string,
        value: string,
        version: number
    ) {
        this.arn = arn
        this.dataType = dataType
        this.lastModifiedDate = lastModifiedDate
        this.name = name
        this.selector = selector
        this.sourceResult = sourceResult
        this.type = type
        this.value = value
        this.version = version
    }

    /**
     * Parses and constructs a Systems Manager's Parameter object from the content
     * of a JSON response returned by the AWS service
     *
     * @param  {Object} json - JSON object as returned and parsed from
     *     the AWS service's API call.
     * @returns {SystemsManagerParameterItem}
     */
    static fromJSON(json: JSONObject): SystemsManagerParameterItem {
        return new SystemsManagerParameterItem(
            json.ARN as string,
            json.DataType as string,
            json.LastModifiedDate as number,
            json.Name as string,
            json.Selector as string,
            json.SourceResult as string,
            json.Type as string,
            json.Value as string,
            json.Version as number
        )
    }
}

export class SystemsManagerServiceError extends AWSError {
    operation: SystemsManagerOperation

    /**
     * Constructs a SystemsManagerServiceError
     *
     * @param  {string} message - human readable error message
     * @param  {string} code - A unique short code representing the error that was emitted
     * @param  {SystemsManagerOperation} operation - Name of the failed Operation
     */
    constructor(message: string, code: string, operation: SystemsManagerOperation) {
        super(message, code)
        this.name = 'SystemsManagerServiceError'
        this.operation = operation
    }
}

/**
 *  SystemsManagerOperation defines all currently implemented Systems Manager operations.
 */
enum SystemsManagerOperation {
    GetParameter = 'GetParameter',
}
