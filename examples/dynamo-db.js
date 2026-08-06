import { check } from "k6";
import exec from "k6/execution";

import { AWSConfig, DynamoDBClient } from "../dist/dynamo-db.js";

const awsConfig = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  sessionToken: __ENV.AWS_SESSION_TOKEN,
});

const dynamoDb = new DynamoDBClient(awsConfig);
const testTableName = "test-jslib-aws-table";

export default async function () {
  const key = {
    pk: { S: "tenant#1" },
    sk: { S: `item#${exec.vu.idInTest}` },
  };

  // Create or replace an item.
  await dynamoDb.putItem(testTableName, {
    ...key,
    value: { S: "hello from k6" },
  });

  // Read it back.
  const item = await dynamoDb.getItem(testTableName, key);
  check(item, { "item was written": (i) => i?.value?.S === "hello from k6" });

  // Update a single attribute.
  await dynamoDb.updateItem(
    testTableName,
    key,
    "SET #v = :v",
    {
      expressionAttributeNames: { "#v": "value" },
      expressionAttributeValues: { ":v": { S: "updated by k6" } },
    },
  );

  // Query all items for this tenant.
  await dynamoDb.query(testTableName, "pk = :pk", {
    expressionAttributeValues: { ":pk": { S: "tenant#1" } },
  });

  // Clean up.
  await dynamoDb.deleteItem(testTableName, key);
}
