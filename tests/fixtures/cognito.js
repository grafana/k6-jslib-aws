import http from "k6/http";
import { SignatureV4 } from "../../dist/signature.js";

// Provision through the service API in setup(): failures abort the test run.
// Only test provisioning lives here; the public client handles discovery/auth.
export async function setupCognitoFixtures(config, fixture) {
  const signature = new SignatureV4({
    service: "cognito-idp",
    region: config.region,
    credentials: config,
  });

  async function request(operation, body) {
    const signed = signature.sign({
      method: "POST",
      endpoint: config.endpoint,
      path: "/",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": `AWSCognitoIdentityProviderService.${operation}`,
      },
      body: JSON.stringify(body),
    });
    const response = await http.asyncRequest("POST", signed.url, signed.body, {
      headers: signed.headers,
      responseType: "text",
    });
    if (response.status !== 200) {
      throw new Error(
        `Cognito fixture ${operation} failed (${response.status}): ${response.body}`,
      );
    }
    return response.json();
  }

  const pool = await request("CreateUserPool", {
    PoolName: fixture.poolName,
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: false,
      },
    },
  });
  const userPoolId = pool.UserPool.Id;
  await request("CreateUserPoolClient", {
    UserPoolId: userPoolId,
    ClientName: fixture.clientName,
    ExplicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
  });
  await request("AdminCreateUser", {
    UserPoolId: userPoolId,
    Username: fixture.username,
    UserAttributes: [{ Name: "email", Value: "test-user@example.com" }],
    MessageAction: "SUPPRESS",
  });
  await request("AdminSetUserPassword", {
    UserPoolId: userPoolId,
    Username: fixture.username,
    Password: fixture.password,
    Permanent: true,
  });
}
