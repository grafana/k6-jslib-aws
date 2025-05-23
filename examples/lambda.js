import { AWSConfig, LambdaClient } from "../dist/lambda.js";
import { check } from "k6";

const awsConfig = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  sessionToken: __ENV.AWS_SESSION_TOKEN,
});

const lambdaClient = new LambdaClient(awsConfig);

export default async function () {
  const response = await lambdaClient.invoke(
    "add-numbers",
    JSON.stringify({ x: 1, y: 2 }),
  );

  check(response, {
    "status is 200": (r) => r.statusCode === 200,
    "payload is 3": (r) => r.payload === 3,
  });
}
