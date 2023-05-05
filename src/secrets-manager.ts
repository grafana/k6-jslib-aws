// Re-Export public symbols
export { AWSConfig, InvalidAWSConfigError } from './internal/config'
export { InvalidSignatureError } from './internal/signature'
export {
    Secret,
    SecretsManagerClient,
    SecretsManagerServiceError,
} from './internal/secrets-manager'
