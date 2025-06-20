export { AWSConfig, InvalidAWSConfigError } from "./internal/config.ts";
export {
  AWSError,
  DNSError,
  GeneralError,
  HTTP2Error,
  NetworkError,
  TCPError,
  TLSError,
} from "./internal/error.ts";
export {
  EventBridgeClient,
  EventBridgeServiceError,
} from "./internal/event-bridge.ts";
export { InvalidSignatureError } from "./internal/signature.ts";
