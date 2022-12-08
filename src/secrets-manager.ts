// Import only symbols we wish to re-export publicly
import { AWSConfig, InvalidAWSConfigError } from './internal/config'
import { InvalidSignatureError } from './internal/signature'
import {
    Secret,
    SecretsManagerClient,
    SecretsManagerServiceError,
} from './internal/secrets-manager'

// Re-Export public symbols
export {
    InvalidSignatureError,
    // Aws Config
    AWSConfig,
    InvalidAWSConfigError,
    // SecretsManager
    SecretsManagerClient,
    Secret,
    SecretsManagerServiceError,
}
