// Re-export public symbols
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
export { InvalidSignatureError } from "./internal/signature";
export {
  SystemsManagerClient,
  SystemsManagerParameter,
  SystemsManagerServiceError,
} from "./internal/ssm";
