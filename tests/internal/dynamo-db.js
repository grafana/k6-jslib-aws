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

  await asyncDescribe(
    "dynamoDb.getItem with consistentRead and projectionExpression",
    async (expect) => {
      // Act: project only the "value" attribute (itself a reserved word,
      // hence the name placeholder), not the primary key.
      const item = await dynamoDb.getItem(
        tableName,
        { pk: { S: "tenant#1" }, sk: { S: "item#1" } },
        {
          consistentRead: true,
          projectionExpression: "#v",
          expressionAttributeNames: { "#v": "value" },
        },
      );

      // Assert: only the projected attribute comes back.
      expect(item).to.not.be.undefined;
      expect(item.value.S).to.equal("alpha");
      expect(item.pk).to.be.undefined;
      expect(item.sk).to.be.undefined;
    },
  );

  await asyncDescribe("dynamoDb.query", async (expect) => {
    // Act
    const result = await dynamoDb.query(
      tableName,
      "pk = :pk",
      {
        expressionAttributeValues: { ":pk": { S: "tenant#1" } },
      },
    );

    // Assert: the items seeded by the init script that no other test ever
    // removes are present. The exact count isn't asserted, since other
    // tests add and remove items within this same partition.
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

    // Assert: the items seeded by the init script that no other test ever
    // removes are present, across both partitions. The exact count isn't
    // asserted, since other tests add and remove items in the table.
    const hasItem = (pk, sk) =>
      result.items.some((i) => i.pk.S === pk && i.sk.S === sk);

    expect(hasItem("tenant#1", "item#1")).to.be.true;
    expect(hasItem("tenant#1", "item#2")).to.be.true;
    expect(hasItem("tenant#2", "item#1")).to.be.true;
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
      // Arrange: a dedicated item, so this test's assumptions can't be
      // broken by an unrelated change to a shared, widely-read item.
      const key = { pk: { S: "tenant#1" }, sk: { S: "item#put-conditional" } };
      await dynamoDb.putItem(tableName, { ...key, value: { S: "original" } });

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
      expect(conditionalCheckError.operation).to.equal("PutItem");

      // ...and the existing item was left untouched.
      const item = await dynamoDb.getItem(tableName, key);
      expect(item.value.S).to.equal("original");
    },
  );

  await asyncDescribe("dynamoDb.updateItem", async (expect) => {
    // Arrange: an explicit starting value, so this test proves a real
    // transition happened (rather than passing as a no-op on a repeat run
    // against the same table, where the item might already be "updated").
    const key = { pk: { S: "tenant#1" }, sk: { S: "item#update" } };
    await dynamoDb.putItem(tableName, { ...key, value: { S: "original" } });

    // Act
    const updated = await dynamoDb.updateItem(
      tableName,
      key,
      "SET #v = :v",
      {
        expressionAttributeNames: { "#v": "value" },
        expressionAttributeValues: { ":v": { S: "updated" } },
        returnValues: "ALL_NEW",
      },
    );

    // Assert
    expect(updated.value.S).to.equal("updated");

    const item = await dynamoDb.getItem(tableName, key);
    expect(item.value.S).to.equal("updated");
  });

  await asyncDescribe("dynamoDb.deleteItem", async (expect) => {
    // Arrange: create the item to delete here, rather than relying on the
    // init script's seed, so this test is safe to rerun against a table
    // that's already been through a previous run of this same suite.
    const key = { pk: { S: "tenant#1" }, sk: { S: "item#delete" } };
    await dynamoDb.putItem(tableName, { ...key, value: { S: "to-delete" } });

    const beforeDelete = await dynamoDb.getItem(tableName, key);
    expect(beforeDelete).to.not.be.undefined;

    // Act
    await dynamoDb.deleteItem(tableName, key);

    // Assert
    const afterDelete = await dynamoDb.getItem(tableName, key);
    expect(afterDelete).to.be.undefined;
  });

  await asyncDescribe(
    "dynamoDb.deleteItem with returnValues and a failing conditionExpression",
    async (expect) => {
      // Arrange
      const key = {
        pk: { S: "tenant#1" },
        sk: { S: "item#delete-conditional" },
      };
      await dynamoDb.putItem(tableName, {
        ...key,
        value: { S: "to-be-deleted" },
      });

      // Act: a delete that should be rejected...
      let conditionalCheckError;
      try {
        await dynamoDb.deleteItem(tableName, key, {
          conditionExpression: "attribute_not_exists(pk)",
        });
      } catch (error) {
        conditionalCheckError = error;
      }

      // Assert: ...because the item exists, so nothing was deleted.
      expect(conditionalCheckError).to.not.be.undefined;
      expect(conditionalCheckError).to.be.an.instanceOf(DynamoDBServiceError);
      expect(conditionalCheckError.code).to.include(
        "ConditionalCheckFailedException",
      );
      expect(conditionalCheckError.operation).to.equal("DeleteItem");

      // Act: delete it for real, returning its previous attributes.
      const deleted = await dynamoDb.deleteItem(tableName, key, {
        returnValues: "ALL_OLD",
      });

      // Assert
      expect(deleted).to.not.be.undefined;
      expect(deleted.value.S).to.equal("to-be-deleted");

      const afterDelete = await dynamoDb.getItem(tableName, key);
      expect(afterDelete).to.be.undefined;
    },
  );

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
      expect(getItemError.operation).to.equal("GetItem");
    },
  );
}
