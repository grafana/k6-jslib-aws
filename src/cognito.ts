// Re-export public Cognito symbols.
export { AWSConfig, InvalidAWSConfigError } from "./internal/config.ts";
export {
  __testOnlyCognitoSrp,
  CognitoIdentityProviderClient,
  CognitoServiceError,
} from "./internal/cognito.ts";
export type {
  CognitoAuthenticationResult,
  CognitoAuthOptions,
  CognitoUserPool,
  CognitoUserPoolClient,
} from "./internal/cognito.ts";
