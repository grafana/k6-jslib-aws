import { asyncDescribe } from "./helpers.js";
import {
  SecretsManagerClient,
  SecretsManagerServiceError,
} from "../../dist/secrets-manager.js";

export async function secretsManagerTestSuite(data) {
  const secretsManagerClient = new SecretsManagerClient(data.awsConfig);

  await asyncDescribe("secretsManager.listSecrets", async (expect) => {
    // Act
    const secrets = await secretsManagerClient.listSecrets();

    // Assert
    expect(secrets).to.be.an("array");
    expect(secrets).to.have.lengthOf(2);
    expect(secrets[0].name).to.equal(data.secretsManager.testSecrets[0].name);
  });

  await asyncDescribe("secretsManager.getSecret", async (expect) => {
    // Act
    const secret = await secretsManagerClient.getSecret(
      data.secretsManager.testSecrets[0].name,
    );

    let getNonExistingSecretError;
    try {
      await secretsManagerClient.getSecret("non-existing-secret");
    } catch (error) {
      getNonExistingSecretError = error;
    }

    // Assert
    expect(secret).to.be.an("object");
    expect(secret.name).to.equal(data.secretsManager.testSecrets[0].name);
    expect(secret.secret).to.equal(data.secretsManager.testSecrets[0].secret);
    expect(getNonExistingSecretError).to.not.be.undefined;
    expect(getNonExistingSecretError).to.be.an.instanceOf(
      SecretsManagerServiceError,
    );
  });

  await asyncDescribe("secretsManager.createSecret", async (expect) => {
    // Act
    const secret = await secretsManagerClient.createSecret(
      data.secretsManager.createdSecretName,
      "created-secret-value",
    );

    // Assert
    expect(secret).to.be.an("object");
    expect(secret.name).to.equal(data.secretsManager.createdSecretName);
    expect(secret).to.not.have.property("secret", secret);
  });

  await asyncDescribe("secretsManager.putSecretValue", async (expect) => {
    // Act
    const secret = await secretsManagerClient.putSecretValue(
      data.secretsManager.createdSecretName,
      "put-secret-value",
    );

    // Assert
    expect(secret).to.be.an("object");
    expect(secret.name).to.equal(data.secretsManager.createdSecretName);
    expect(secret).to.not.have.property("secret", secret);
  });

  await asyncDescribe("secretsManager.deleteSecretValue", async (expect) => {
    // Act
    let deleteSecretError;
    try {
      await secretsManagerClient.deleteSecret(
        data.secretsManager.deleteSecretName,
        {
          noRecovery: true,
        },
      );
    } catch (error) {
      deleteSecretError = error;
    }

    // Assert
    expect(deleteSecretError).to.be.undefined;
  });

  // Teardown

  // Delete the secret created by the secrets manager tests.
  await secretsManagerClient.deleteSecret(
    data.secretsManager.createdSecretName,
    {
      noRecovery: true,
    },
  );
}
