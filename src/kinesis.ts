// Import only symbols we wish to re-export publicly
import { AWSConfig, InvalidAWSConfigError } from './internal/config'
import { InvalidSignatureError } from './internal/signature'
import { KinesisClient } from './internal/kinesis'

// Re-Export public symbols
export {
    InvalidSignatureError,
    // Aws Config
    AWSConfig,
    InvalidAWSConfigError,
    // Kinesis
    KinesisClient
}
