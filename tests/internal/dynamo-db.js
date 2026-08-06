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
      // Act
      const previous = await dynamoDb.putItem(
        tableName,
        {
          pk: { S: "tenant#1" },
          sk: { S: "item#put" },
          value: { S: "overwritten-by-test" },
        },
        { returnValues: "ALL_OLD" },
      );

      // Assert
      expect(previous).to.not.be.undefined;
      expect(previous.value.S).to.equal("created-by-test");
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
