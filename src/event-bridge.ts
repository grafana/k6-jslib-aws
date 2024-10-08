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
export { EventBridgeClient, EventBridgeServiceError } from './internal/event-bridge'
export { InvalidSignatureError } from './internal/signature'
