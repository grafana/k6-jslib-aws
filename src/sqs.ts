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
export { InvalidSignatureError } from "./internal/signature.ts";
export { ReceivedMessage, SQSClient, SQSServiceError } from "./internal/sqs.ts";
