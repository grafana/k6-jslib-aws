// Import only symbols we wish to re-export publicly
import { signHeaders, InvalidSignatureError, URIEncodingConfig } from './internal/signature'
import { AWSConfig, InvalidAWSConfigError } from './internal/config'
import { S3Client, S3Bucket, S3Object, S3ServiceError } from './internal/s3'
import {
    SecretsManagerClient,
    Secret,
    SecretsManagerServiceError,
} from './internal/secrets-manager'
import { KMSClient, KMSDataKey, KMSServiceError } from './internal/kms'

// Re-Export public symbols
export {
    // AWS Signature V4
    signHeaders,
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
    // SecretsManager
    SecretsManagerClient,
    Secret,
    SecretsManagerServiceError,
    // KMS
    KMSClient,
    KMSDataKey,
    KMSServiceError,
}
