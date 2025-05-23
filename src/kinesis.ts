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
export { KinesisClient, KinesisServiceError } from "./internal/kinesis";
