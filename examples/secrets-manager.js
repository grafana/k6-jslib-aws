import exec from "k6/execution";

import { AWSConfig, SecretsManagerClient } from "../dist/secrets-manager.js";

const awsConfig = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  sessionToken: __ENV.AWS_SESSION_TOKEN,
});

const secretsManager = new SecretsManagerClient(awsConfig);
const testSecretName = "jslib-test-secret";
const testSecretValue = "jslib-test-value";

export default async function () {
  // Let's make sure our test secret is created
  const testSecret = await secretsManager.createSecret(
    testSecretName,
    testSecretValue,
    "this is a test secret, delete me.",
  );

  // List the secrets the AWS authentication configuration
  // gives us access to, and verify the creation was successful.
  const secrets = await secretsManager.listSecrets();
  if (!secrets.filter((s) => s.name === testSecret.name).length == 0) {
    exec.test.abort("test secret not found");
  }

  // Now that we know the secret exist, let's update its value
  const newTestSecretValue = "new-test-value";
  await secretsManager.putSecretValue(testSecretName, newTestSecretValue);

  // Let's get its value and verify it was indeed updated
  const updatedSecret = await secretsManager.getSecret(testSecretName);
  if (updatedSecret.secret !== newTestSecretValue) {
    exec.test.abort("unable to update test secret");
  }

  // Finally, let's delete our test secret and verify it worked
  await secretsManager.deleteSecret(updatedSecret.name, { noRecovery: true });
}
