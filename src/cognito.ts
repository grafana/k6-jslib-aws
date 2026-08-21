// Re-export public Cognito symbols.
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
