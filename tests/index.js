import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

import { AWSConfig } from "../dist/index.js";

import { s3TestSuite } from "./internal/s3.js";
import { secretsManagerTestSuite } from "./internal/secrets-manager.js";
import { kmsTestSuite } from "./internal/kms.js";
import { ssmTestSuite } from "./internal/ssm.js";
import { kinesisTestSuite } from "./internal/kinesis.js";
import { signatureV4TestSuite } from "./internal/signature.js";
import { sqsTestSuite } from "./internal/sqs.js";
import { eventBridgeTestSuite } from "./internal/event-bridge.js";
import { lambdaTestSuite } from "./internal/lambda.js";

// Must know:
//   * end2end tests such as these rely on the localstack
//   docker compose stack to be running. See the docker-compose.yml
//   file in the root of the project.
//   * The localstack docker compose stack is initialized with
//   some data using the scripts found in tests/localstack_init/*.sh.
//   These scripts are ran everytime the localstack container starts.
//   The following tests rely on the data created by these scripts.
//
// Initialize an AWS configuration set to use the localstack service.
const awsConfig = new AWSConfig({
  // Localstack runs on localhost:4566
  endpoint: "http://localhost.localstack.cloud:4566",

  // Localstack is setup to use the us-east-1 region
  region: "us-east-1",

  // Dummy value to keep the client happy
  accessKeyId: "RUSZHYJUBIXGH4A5AAIX",

  // Dummy value to keep the client happy
  secretAccessKey: "9g7dpx9QU4XNawNHkMnXUQ6LgTfZIPG6fnIdADDQ",

  // Dummy value to keep the client happy
  sessionToken: "sessiontoken",
});

const testData = {
  awsConfig: awsConfig,

  // S3 tests specific data
  s3: {
    testBucketName: "test-jslib-aws",
    testObjects: [
      {
        key: "bonjour.txt",
        body: "Bonjour le monde!",
      },
      {
        key: "tschuss.txt",
        body: "Tschuss, welt!",
      },
      {
        key: "delete.txt",
        body: "Delete me in a test!",
      },
    ],
  },

  // Secrets Manager tests specific data
  secretsManager: {
    createdSecretName: `test-created-secret-${randomIntBetween(0, 10000)}`,
    deleteSecretName: "test-delete-secret",
    testSecrets: [
      {
        name: "test-secret",
        secret: "test-secret-value",
      },
    ],
  },

  // Simple Queue Service tests specific data
  sqs: {
    testQueues: {
      fifoQueueSend:
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/fifo-test-queue.fifo",
      fifo:
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/responding-test-queue.fifo",
      standard:
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/responding-test-standard-queue",
      emptyQueue:
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/fifo-test-queue.fifo",
      deleteQueue:
        "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/message-deletion-test-queue",
    },
  },

  // Systems Manager tests specific data
  systemsManager: {
    testParameter: {
      name: `test-parameter`,
      value: `test-parameter-value`,
    },
    testParameterSecret: {
      name: `test-parameter-secret`,
      value: `test-parameter-secret-value`,
    },
  },
};

export const options = {
  thresholds: {
    // As we're essentially unit testing here, we want to make sure that
    // the rate of successful checks is 100%
    checks: ["rate>=1"],
  },
};

export default async function () {
  signatureV4TestSuite();
  await s3TestSuite(testData);
  await secretsManagerTestSuite(testData);
  await kmsTestSuite(testData);
  await sqsTestSuite(testData);
  await ssmTestSuite(testData);
  await kinesisTestSuite(testData);
  await eventBridgeTestSuite(testData);
  await lambdaTestSuite(testData);
}
