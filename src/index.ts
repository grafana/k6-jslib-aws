// Import only symbols we wish to re-export publicly
// TODO: remove me
import { InvalidSignatureError } from './internal/signature'

import { AWSConfig, InvalidAWSConfigError } from './internal/config'
import { AMZ_CONTENT_SHA256_HEADER, UNSIGNED_PAYLOAD } from './internal/constants'
import { KMSClient, KMSDataKey, KMSServiceError } from './internal/kms'
import { SignatureV4 } from './internal/signature'
import { S3Bucket, S3Client, S3Object, S3ServiceError } from './internal/s3'
import {
    Secret,
    SecretsManagerClient,
    SecretsManagerServiceError,
} from './internal/secrets-manager'
import {
    SystemsManagerClient,
    SystemsManagerParameter,
    SystemsManagerServiceError,
} from './internal/ssm'

// Re-Export public symbols
export {
    InvalidSignatureError,
    // Aws Config
    AWSConfig,
    InvalidAWSConfigError,
    // Signature
    SignatureV4,
    AMZ_CONTENT_SHA256_HEADER,
    UNSIGNED_PAYLOAD,
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
    // SystemsManager
    SystemsManagerClient,
    SystemsManagerParameter,
    SystemsManagerServiceError,
}
