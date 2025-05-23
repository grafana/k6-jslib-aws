import exec from "k6/execution";

import { AWSConfig, SystemsManagerClient } from "../dist/ssm.js";

const awsConfig = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  sessionToken: __ENV.AWS_SESSION_TOKEN,
});

const systemsManager = new SystemsManagerClient(awsConfig);
const testParameterName = "jslib-test-parameter";
const testParameterValue = "jslib-test-value";
const testParameterSecretName = "jslib-test-parameter-secret";
// this value was created with --type SecureString
const testParameterSecretValue = "jslib-test-secret-value";

export default async function () {
  // Currently the parameter needs to be created before hand

  // Let's get its value
  // getParameter returns a parameter object: e.g. {name: string, value: string...}
  const parameter = await systemsManager.getParameter(testParameterName);
  if (parameter.value !== testParameterValue) {
    exec.test.abort("test parameter not found");
  }

  // Let's get the secret value with decryption
  // destructure the parameter object to get to the values you want
  const { value: encryptedParameterValue } = await systemsManager.getParameter(
    testParameterSecretName,
    true,
  );
  if (encryptedParameterValue !== testParameterSecretValue) {
    exec.test.abort("encrypted test parameter not found");
  }
}
