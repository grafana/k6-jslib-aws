import { asyncDescribe } from "./helpers.js";
import { KMSClient } from "../../dist/kms.js";

export async function kmsTestSuite(data) {
  const kmsClient = new KMSClient(data.awsConfig);

  await asyncDescribe("kms.listKeys", async (expect) => {
    // Act
    const keys = await kmsClient.listKeys();

    // Assert
    expect(keys).to.be.an("array");
    expect(keys).to.have.lengthOf(1);
    expect(keys[0]).to.be.an("object");
    expect(keys[0].keyId).to.not.equal("");
    expect(keys[0].keyArn).to.not.equal("");
  });

  await asyncDescribe("kms.generateDataKey", async (expect) => {
    // Arrange
    const keys = await kmsClient.listKeys();
    const keyId = keys[0].keyId;

    // Act
    const dataKey = await kmsClient.generateDataKey(keyId, 32);

    // Assert
    expect(dataKey).to.be.an("object");
    expect(dataKey.id).to.not.equal("");
    expect(dataKey.ciphertextBlobText).to.not.equal("");
    expect(dataKey.plaintext).to.not.equal("");
  });
}
