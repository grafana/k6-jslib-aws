import { asyncDescribe } from "./helpers.js";
import { DynamoDBClient, DynamoDBServiceError } from "../../dist/dynamo-db.js";

export async function dynamoDbTestSuite(data) {
  const dynamoDb = new DynamoDBClient(data.awsConfig);
  const tableName = data.dynamoDb.tableName;

  await asyncDescribe("dynamoDb.getItem", async (expect) => {
    // Act
    const item = await dynamoDb.getItem(tableName, {
      pk: { S: "tenant#1" },
      sk: { S: "item#1" },
    });

    // Assert
    expect(item).to.not.be.undefined;
    expect(item.value.S).to.equal("alpha"); // as seeded by the init script
  });

  await asyncDescribe("dynamoDb.getItem non-existent item", async (expect) => {
    // Act
    const item = await dynamoDb.getItem(tableName, {
      pk: { S: "tenant#does-not-exist" },
      sk: { S: "item#1" },
    });

    // Assert
    expect(item).to.be.undefined;
  });

  await asyncDescribe("dynamoDb.query", async (expect) => {
    // Act
    const result = await dynamoDb.query(
      tableName,
      "pk = :pk",
      {
        expressionAttributeValues: { ":pk": { S: "tenant#1" } },
      },
    );

    // Assert
    expect(result.count).to.equal(4); // item#1, item#2, item#update, item#delete
    expect(result.items).to.have.length(4);
    expect(result.items.map((i) => i.sk.S)).to.include("item#1");
    expect(result.items.map((i) => i.sk.S)).to.include("item#2");
  });

  await asyncDescribe(
    "dynamoDb.query pagination via lastEvaluatedKey",
    async (expect) => {
      // Act: fetch a single item at a time.
      const firstPage = await dynamoDb.query(tableName, "pk = :pk", {
        expressionAttributeValues: { ":pk": { S: "tenant#1" } },
        limit: 1,
      });

      // Assert: exactly one item, and a token to continue from.
      expect(firstPage.items).to.have.length(1);
      expect(firstPage.lastEvaluatedKey).to.not.be.undefined;

      // Act: continue from where the first page left off.
      const secondPage = await dynamoDb.query(tableName, "pk = :pk", {
        expressionAttributeValues: { ":pk": { S: "tenant#1" } },
        limit: 1,
        exclusiveStartKey: firstPage.lastEvaluatedKey,
      });

      // Assert: the second page picks up a different item than the first.
      expect(secondPage.items).to.have.length(1);
      expect(secondPage.items[0].sk.S).to.not.equal(firstPage.items[0].sk.S);
    },
  );

  await asyncDescribe(
    "dynamoDb.query with filterExpression",
    async (expect) => {
      // Act: match the whole partition, then filter down post-fetch to a
      // single item by an attribute value that is not part of the key.
      // "value" is a DynamoDB reserved word, hence the name placeholder.
      const result = await dynamoDb.query(tableName, "pk = :pk", {
        expressionAttributeNames: { "#v": "value" },
        expressionAttributeValues: {
          ":pk": { S: "tenant#1" },
          ":v": { S: "alpha" },
        },
        filterExpression: "#v = :v",
      });

      // Assert: the filter narrowed the results down to the one matching
      // item, even though more items than that were scanned to find it.
      expect(result.items).to.have.length(1);
      expect(result.items[0].sk.S).to.equal("item#1");
      expect(result.scannedCount).to.be.above(result.count);
    },
  );

  await asyncDescribe("dynamoDb.query scanIndexForward", async (expect) => {
    // Act: fetch the partition in default (ascending) order, then reversed.
    const ascending = await dynamoDb.query(tableName, "pk = :pk", {
      expressionAttributeValues: { ":pk": { S: "tenant#1" } },
    });
    const descending = await dynamoDb.query(tableName, "pk = :pk", {
      expressionAttributeValues: { ":pk": { S: "tenant#1" } },
      scanIndexForward: false,
    });

    // Assert: the two orders are the reverse of one another.
    const ascendingKeys = ascending.items.map((i) => i.sk.S);
    const descendingKeys = descending.items.map((i) => i.sk.S);
    expect(descendingKeys).to.deep.equal([...ascendingKeys].reverse());
  });

  await asyncDescribe("dynamoDb.scan", async (expect) => {
    // Act
    const result = await dynamoDb.scan(tableName);

    // Assert
    expect(result.count).to.equal(5); // all items seeded by the init script
    expect(result.items).to.have.length(5);
  });

  await asyncDescribe("dynamoDb.putItem", async (expect) => {
    // Act
    await dynamoDb.putItem(tableName, {
      pk: { S: "tenant#1" },
      sk: { S: "item#put" },
      value: { S: "created-by-test" },
    });

    // Assert
    const item = await dynamoDb.getItem(tableName, {
      pk: { S: "tenant#1" },
      sk: { S: "item#put" },
    });
    expect(item.value.S).to.equal("created-by-test");
  });

  await asyncDescribe(
    "dynamoDb.putItem returns previous attributes",
    async (expect) => {
      // Arrange
      const key = { pk: { S: "tenant#1" }, sk: { S: "item#put-returns-old" } };
      await dynamoDb.putItem(tableName, {
        ...key,
        value: { S: "created-by-test" },
      });

      // Act
      const previous = await dynamoDb.putItem(
        tableName,
        { ...key, value: { S: "overwritten-by-test" } },
        { returnValues: "ALL_OLD" },
      );

      // Assert
      expect(previous).to.not.be.undefined;
      expect(previous.value.S).to.equal("created-by-test");
    },
  );

  await asyncDescribe(
    "dynamoDb.putItem with a failing conditionExpression",
    async (expect) => {
      // Arrange: seeded by the init script, untouched by other tests.
      const key = { pk: { S: "tenant#1" }, sk: { S: "item#1" } };

      // Act
      let conditionalCheckError;
      try {
        await dynamoDb.putItem(
          tableName,
          { ...key, value: { S: "should-not-be-written" } },
          { conditionExpression: "attribute_not_exists(pk)" },
        );
      } catch (error) {
        conditionalCheckError = error;
      }

      // Assert: the condition failed since the item already exists...
      expect(conditionalCheckError).to.not.be.undefined;
      expect(conditionalCheckError).to.be.an.instanceOf(DynamoDBServiceError);
      expect(conditionalCheckError.code).to.include(
        "ConditionalCheckFailedException",
      );

      // ...and the existing item was left untouched.
      const item = await dynamoDb.getItem(tableName, key);
      expect(item.value.S).to.equal("alpha");
    },
  );

  await asyncDescribe("dynamoDb.updateItem", async (expect) => {
    // Act
    const updated = await dynamoDb.updateItem(
      tableName,
      { pk: { S: "tenant#1" }, sk: { S: "item#update" } },
      "SET #v = :v",
      {
        expressionAttributeNames: { "#v": "value" },
        expressionAttributeValues: { ":v": { S: "updated" } },
        returnValues: "ALL_NEW",
      },
    );

    // Assert
    expect(updated.value.S).to.equal("updated");

    const item = await dynamoDb.getItem(tableName, {
      pk: { S: "tenant#1" },
      sk: { S: "item#update" },
    });
    expect(item.value.S).to.equal("updated");
  });

  await asyncDescribe("dynamoDb.deleteItem", async (expect) => {
    // Arrange
    const beforeDelete = await dynamoDb.getItem(tableName, {
      pk: { S: "tenant#1" },
      sk: { S: "item#delete" },
    });
    expect(beforeDelete).to.not.be.undefined;

    // Act
    await dynamoDb.deleteItem(tableName, {
      pk: { S: "tenant#1" },
      sk: { S: "item#delete" },
    });

    // Assert
    const afterDelete = await dynamoDb.getItem(tableName, {
      pk: { S: "tenant#1" },
      sk: { S: "item#delete" },
    });
    expect(afterDelete).to.be.undefined;
  });

  await asyncDescribe(
    "dynamoDb.getItem from non-existent table",
    async (expect) => {
      // Act
      let getItemError;
      try {
        await dynamoDb.getItem("non-existent-table", {
          pk: { S: "tenant#1" },
          sk: { S: "item#1" },
        });
      } catch (error) {
        getItemError = error;
      }

      // Assert
      expect(getItemError).to.not.be.undefined;
      expect(getItemError).to.be.an.instanceOf(DynamoDBServiceError);
    },
  );
}
