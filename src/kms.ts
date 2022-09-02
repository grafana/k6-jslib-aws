// Import only symbols we wish to re-export publicly
import { signHeaders, InvalidSignatureError, URIEncodingConfig } from './internal/signature'
import { AWSConfig, InvalidAWSConfigError } from './internal/config'
import {
    KMSClient,
    DataKey,
    KMSServiceError,
} from './internal/kms'

// Re-Export public symbols
export {
    // AWS Signature V4
    signHeaders,
    InvalidSignatureError,
    URIEncodingConfig,
    // Aws Config
    AWSConfig,
    InvalidAWSConfigError,
    // KMS
    KMSClient,
    DataKey,
    KMSServiceError,
}
