// Re-Export public symbols
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
export { KMSClient, KMSDataKey, KMSServiceError } from "./internal/kms.ts";
export { InvalidSignatureError } from "./internal/signature.ts";
