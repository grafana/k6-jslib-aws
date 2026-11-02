import { asyncDescribe } from "./helpers.js";
import { KMSClient } from "../../dist/kms.js";

export async function kmsTestSuite(data) {
  const kmsClient = new KMSClient(data.awsConfig);

  await asyncDescribe("kms.listKeys", async (expect) => {
    // Act
    const keys = await kmsClient.listKeys();

    // Assert
    expect(keys).to.be.an("array");
    // Services can provision AWS-managed keys in addition to our fixture key.
    const fixtureKey = keys.find((key) => key.keyId === data.kms.keyId);
    expect(fixtureKey).to.be.an("object");
    expect(fixtureKey.keyId).to.equal(data.kms.keyId);
    expect(fixtureKey.keyArn).to.not.equal("");
  });

  await asyncDescribe("kms.generateDataKey", async (expect) => {
    // Arrange
    const keys = await kmsClient.listKeys();
    const keyId = keys.find((key) => key.keyId === data.kms.keyId).keyId;

    // Act
    const dataKey = await kmsClient.generateDataKey(keyId, 32);

    // Assert
    expect(dataKey).to.be.an("object");
    expect(dataKey.id).to.not.equal("");
    expect(dataKey.ciphertextBlobText).to.not.equal("");
    expect(dataKey.plaintext).to.not.equal("");
  });
}
