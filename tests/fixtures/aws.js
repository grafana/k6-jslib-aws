import { parseHTML } from "k6/html";
import { b64encode } from "k6/encoding";
import { AWSConfig, S3Client } from "../../dist/index.js";
import {
  assertSignatureVerification,
  fixtureJson,
  fixtureRequest,
} from "./request.js";
import { setupCognitoFixtures } from "./cognito.js";

const handlers = {
  "test-product": open("./lambda/test-product.zip", "b"),
  "test-fail": open("./lambda/test-fail.zip", "b"),
};

export async function setupFixtures(bootstrapConfig, data) {
  const iam = async (action, values) => {
    const body = Object.entries({
      Action: action,
      Version: "2010-05-08",
      ...values,
    })
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join("&");
    const response = await fixtureRequest(bootstrapConfig, "iam", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return parseHTML(response.body);
  };
  // Only IAM bootstrapping uses fakecloud's reserved root identity. Generated
  // keys ensure the actual service tests exercise signature verification.
  await iam("CreateUser", { UserName: "jslib-tests" });
  const key = await iam("CreateAccessKey", { UserName: "jslib-tests" });
  const credentials = {
    accessKeyId: key.find("AccessKeyId").text(),
    secretAccessKey: key.find("SecretAccessKey").text(),
  };
  const config = new AWSConfig({
    ...credentials,
    region: bootstrapConfig.region,
    endpoint: bootstrapConfig.endpoint,
  });
  const json = (service, target, body) =>
    fixtureJson(config, service, target, body);
  await assertSignatureVerification(config);

  const s3 = new S3Client(config);
  await fixtureRequest(config, "s3", {
    method: "PUT",
    path: `/${data.s3.testBucketName}`,
    headers: {},
  });
  for (const object of data.s3.testObjects) {
    await s3.putObject(data.s3.testBucketName, object.key, object.body);
  }

  const kms = await json("kms", "TrentService.CreateKey", {
    Description: "test key",
  });
  await json("kms", "TrentService.CreateAlias", {
    AliasName: "alias/test-key",
    TargetKeyId: kms.KeyMetadata.KeyId,
  });
  for (const name of ["test-secret", "test-delete-secret"]) {
    await json("secretsmanager", "secretsmanager.CreateSecret", {
      Name: name,
      SecretString: "test-secret-value",
    });
  }
  for (const parameter of [
    data.systemsManager.testParameter,
    data.systemsManager.testParameterSecret,
  ]) {
    const secure = parameter === data.systemsManager.testParameterSecret;
    await json("ssm", "AmazonSSM.PutParameter", {
      Name: parameter.name,
      Value: parameter.value,
      Type: secure ? "SecureString" : "String",
      ...(secure ? { KeyId: kms.KeyMetadata.KeyId } : {}),
    });
  }

  const queueUrls = {};
  for (const name of [
    "standard-test-queue",
    "fifo-test-queue.fifo",
    "responding-test-standard-queue",
    "responding-test-queue.fifo",
    "message-deletion-test-queue",
  ]) {
    const queue = await json("sqs", "AmazonSQS.CreateQueue", {
      QueueName: name,
      Attributes: name.endsWith(".fifo") ? { FifoQueue: "true" } : {},
    });
    queueUrls[name] = queue.QueueUrl;
  }
  for (const [name, body, deduplication] of [
    ["responding-test-standard-queue", "Hello, k6!"],
    ["responding-test-queue.fifo", "Goodbye, AWS!", "123"],
    ["responding-test-queue.fifo", "Farewell, cloud!", "1231"],
    ["message-deletion-test-queue", "See you later"],
  ]) {
    await json("sqs", "AmazonSQS.SendMessage", {
      QueueUrl: queueUrls[name],
      MessageBody: body,
      ...(deduplication
        ? { MessageGroupId: "1", MessageDeduplicationId: deduplication }
        : {}),
    });
  }

  const dynamoDb = (operation, body) =>
    fixtureJson(
      config,
      "dynamodb",
      `DynamoDB_20120810.${operation}`,
      body,
      "application/x-amz-json-1.0",
    );
  await dynamoDb("CreateTable", {
    TableName: data.dynamoDb.tableName,
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "sk", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "sk", KeyType: "RANGE" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  });
  for (const [pk, sk, value] of [
    ["tenant#1", "item#1", "alpha"],
    ["tenant#1", "item#2", "beta"],
    ["tenant#2", "item#1", "gamma"],
  ]) {
    await dynamoDb("PutItem", {
      TableName: data.dynamoDb.tableName,
      Item: { pk: { S: pk }, sk: { S: sk }, value: { S: value } },
    });
  }

  const role = await iam("CreateRole", {
    RoleName: "lambda-role",
    AssumeRolePolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "lambda.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    }),
  });
  for (const [name, archive] of Object.entries(handlers)) {
    await fixtureRequest(config, "lambda", {
      method: "POST",
      path: "/2015-03-31/functions",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FunctionName: name,
        Runtime: "nodejs18.x",
        Handler: "index.handler",
        Role: role.find("Arn").text(),
        Code: { ZipFile: b64encode(archive) },
      }),
    });
  }
  await setupCognitoFixtures(config, data.cognito);
  return {
    credentials,
    kmsKeyId: kms.KeyMetadata.KeyId,
    testQueues: {
      standardSend: queueUrls["standard-test-queue"],
      fifoQueueSend: queueUrls["fifo-test-queue.fifo"],
      fifo: queueUrls["responding-test-queue.fifo"],
      standard: queueUrls["responding-test-standard-queue"],
      emptyQueue: queueUrls["fifo-test-queue.fifo"],
      deleteQueue: queueUrls["message-deletion-test-queue"],
    },
  };
}
