import { parseHTML } from 'k6/html'

/**
 * Base class to derive errors from
 *
 * Inspired from AWS official error types, as
 * described in:
 *   * https://aws.amazon.com/blogs/developer/service-error-handling-modular-aws-sdk-js/
 *   * https://github.com/aws/aws-sdk-js/blob/master/lib/error.d.ts
 */
export class AWSError extends Error {
    code: string

    /**
     * Create an AWSError
     *
     * @param {string} message - A longer human readable error message.
     * @param {string} code - A unique short code representing the error that was emitted
     */
    constructor(message: string, code: string) {
        super(message)
        this.name = 'AWSError'
        this.code = code
    }

    /**
     * Parse an AWSError from an XML document
     *
     * @param  {string} xmlDocument - Serialized XML document to parse the error from
     */
    static parseXML(xmlDocument: string): AWSError {
        const doc = parseHTML(xmlDocument)
        return new AWSError(doc.find('Message').text(), doc.find('Code').text())
    }
}
