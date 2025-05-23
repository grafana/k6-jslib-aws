export { AWSConfig, InvalidAWSConfigError } from "./internal/config";
export {
  AWSError,
  DNSError,
  GeneralError,
  HTTP2Error,
  NetworkError,
  TCPError,
  TLSError,
} from "./internal/error";
export {
  EventBridgeClient,
  EventBridgeServiceError,
} from "./internal/event-bridge";
export { InvalidSignatureError } from "./internal/signature";
