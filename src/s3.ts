// Import only symbols we wish to re-export publicly
import { InvalidSignatureError, URIEncodingConfig } from './internal/signature'
import { AWSConfig, InvalidAWSConfigError } from './internal/config'
import { S3Client, S3Bucket, S3Object, S3ServiceError } from './internal/s3'

// Re-Export public symbols
export {
    // AWS Signature V4
    InvalidSignatureError,
    URIEncodingConfig,
    // Aws Config
    AWSConfig,
    InvalidAWSConfigError,
    // S3
    S3Client,
    S3Bucket,
    S3Object,
    S3ServiceError,
}
