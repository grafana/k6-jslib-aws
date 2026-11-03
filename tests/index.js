import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

import { AWSConfig } from "../dist/index.js";
import { check } from "k6";
import { setupFixtures } from "./fixtures/aws.js";

import { s3TestSuite } from "./internal/s3.js";
import { secretsManagerTestSuite } from "./internal/secrets-manager.js";
import { kmsTestSuite } from "./internal/kms.js";
import { ssmTestSuite } from "./internal/ssm.js";
import { kinesisTestSuite } from "./internal/kinesis.js";
import { signatureV4TestSuite } from "./internal/signature.js";
import { sqsTestSuite } from "./internal/sqs.js";
import { eventBridgeTestSuite } from "./internal/event-bridge.js";
import { lambdaTestSuite } from "./internal/lambda.js";
import { dynamoDbTestSuite } from "./internal/dynamo-db.js";
import { cognitoTestSuite } from "./internal/cognito.js";

// The Compose stack supplies a fresh fakecloud instance. setup() provisions
// fixtures through AWS APIs; service tests use generated IAM credentials.
const awsConfig = new AWSConfig({
  endpoint: __ENV.AWS_TEST_ENDPOINT || "http://amazonaws.com:4566",
  region: "us-east-1",
  // fakecloud reserves test-prefixed credentials for IAM bootstrapping.
  accessKeyId: "test-bootstrap-key",
  secretAccessKey: "test-bootstrap-secret",
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
  sqs: {},

  // DynamoDB tests specific data
  dynamoDb: {
    tableName: "test-jslib-aws-table",
  },

  cognito: {
    poolName: "test-jslib-aws",
    clientName: "test-jslib-aws",
    username: "test-user",
    password: "TestPassword1",
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
  // Keep AWS-shaped hosts local, including S3 virtual-hosted bucket names,
  // without relying on LocalStack's public wildcard DNS records.
  hosts: {
    "amazonaws.com": "127.0.0.1",
    "*.amazonaws.com": "127.0.0.1",
  },
  thresholds: {
    // As we're essentially unit testing here, we want to make sure that
    // the rate of successful checks is 100%
    checks: ["rate>=1"],
  },
};

export async function setup() {
  return await setupFixtures(awsConfig, testData);
}

export default async function (fixtures) {
  testData.awsConfig = new AWSConfig({
    region: awsConfig.region,
    endpoint: awsConfig.endpoint,
    ...fixtures.credentials,
  });
  testData.sqs.testQueues = fixtures.testQueues;
  testData.kms = { keyId: fixtures.kmsKeyId };
  try {
    signatureV4TestSuite();
    await s3TestSuite(testData);
    await secretsManagerTestSuite(testData);
    await kmsTestSuite(testData);
    await sqsTestSuite(testData);
    await ssmTestSuite(testData);
    await kinesisTestSuite(testData);
    await eventBridgeTestSuite(testData);
    await lambdaTestSuite(testData);
    await dynamoDbTestSuite(testData);
    await cognitoTestSuite(testData);
  } catch (error) {
    check(null, { "all service suites completed": () => false });
    throw error;
  }
}
