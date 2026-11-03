import { AWSConfig, CognitoIdentityProviderClient } from "../dist/cognito.js";

const config = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
});

const cognito = new CognitoIdentityProviderClient(config);

export default async function () {
  const tokens = await cognito.authenticateUser(
    __ENV.COGNITO_USERNAME,
    __ENV.COGNITO_PASSWORD,
    __ENV.COGNITO_USER_POOL_ID,
    __ENV.COGNITO_CLIENT_ID,
  );

  // Use tokens.AccessToken, tokens.IdToken, or tokens.RefreshToken as needed.
  console.log(tokens.AccessToken);
}
