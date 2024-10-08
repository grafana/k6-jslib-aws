// Re-Export public symbols
export { AWSConfig, InvalidAWSConfigError } from './internal/config'
export {
    AWSError,
    NetworkError,
    GeneralError,
    DNSError,
    TCPError,
    TLSError,
    HTTP2Error,
} from './internal/error'
export { InvalidSignatureError } from './internal/signature'
export {
    Secret,
    SecretsManagerClient,
    SecretsManagerServiceError,
} from './internal/secrets-manager'
