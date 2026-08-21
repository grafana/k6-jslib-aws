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

// Distinct from any partition key used by seeded test data, so this demo
// never collides with pre-existing items for low VU ids.
const examplePartitionKey = "tenant#example";

export default async function () {
  const key = {
    pk: { S: examplePartitionKey },
    sk: { S: `item#${exec.vu.idInTest}` },
  };

  // Create the item, guarding against overwriting one left over from a
  // previous, uncleaned run of this same VU.
  await dynamoDb.putItem(
    testTableName,
    { ...key, value: { S: "hello from k6" } },
    { conditionExpression: "attribute_not_exists(pk)" },
  );

  // Read it back with a strongly consistent read, since we just wrote it.
  const item = await dynamoDb.getItem(testTableName, key, {
    consistentRead: true,
  });
  check(item, { "item was written": (i) => i?.value?.S === "hello from k6" });

  // Update a single attribute and get the new value back.
  const updated = await dynamoDb.updateItem(
    testTableName,
    key,
    "SET #v = :v",
    {
      expressionAttributeNames: { "#v": "value" },
      expressionAttributeValues: { ":v": { S: "updated by k6" } },
      returnValues: "ALL_NEW",
    },
  );
  check(updated, { "item was updated": (i) => i.value.S === "updated by k6" });

  // Query for this tenant's items, filtering down to the value we just set
  // (other VUs are writing under the same partition key concurrently). A
  // consistent read avoids racing the update above.
  const matches = await dynamoDb.query(testTableName, "pk = :pk", {
    expressionAttributeNames: { "#v": "value" },
    expressionAttributeValues: {
      ":pk": { S: examplePartitionKey },
      ":v": { S: "updated by k6" },
    },
    filterExpression: "#v = :v",
    consistentRead: true,
  });
  check(matches, { "query found the item": (r) => r.count >= 1 });

  // Scan the whole table, one page at a time.
  let page = await dynamoDb.scan(testTableName, { limit: 25 });
  let scannedCount = page.scannedCount;
  while (page.lastEvaluatedKey) {
    page = await dynamoDb.scan(testTableName, {
      limit: 25,
      exclusiveStartKey: page.lastEvaluatedKey,
    });
    scannedCount += page.scannedCount;
  }
  check(scannedCount, { "scan visited at least one item": (n) => n >= 1 });

  // Clean up.
  await dynamoDb.deleteItem(testTableName, key);
}
