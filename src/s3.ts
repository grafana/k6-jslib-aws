// Import only symbols we wish to re-export publicly
import { AWSConfig, InvalidAWSConfigError } from './internal/config'
import { InvalidSignatureError } from './internal/signature'
import {
    S3Bucket,
    S3Client,
    S3MultipartUpload,
    S3Object,
    S3Part,
    S3ServiceError,
} from './internal/s3'

// Re-Export public symbols
export {
    InvalidSignatureError,
    // Aws Config
    AWSConfig,
    InvalidAWSConfigError,
    // S3
    S3Client,
    S3Bucket,
    S3Object,
    S3MultipartUpload,
    S3Part,
    S3ServiceError,
}
