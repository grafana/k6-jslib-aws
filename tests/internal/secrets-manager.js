import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'
import {
    AWSConfig,
    SecretsManagerClient,
    SecretsManagerServiceError,
} from '../../build/secrets-manager.min.js'

export function secretsManagerTestSuite(data) {
    // FIXME: due to what is probably a bug in LocalStack, the `localhost`
    // region is invalid for the secrets manager service. Thus we set it up
    // to a real one.
    const secretsManagerClient = new SecretsManagerClient(data.awsConfig)

    describe('list secrets', () => {
        // Act
        const secrets = secretsManagerClient.listSecrets()

        // Assert
        expect(secrets).to.be.an('array')
        expect(secrets).to.have.lengthOf(2)
        expect(secrets[0].name).to.equal(data.secretsManager.testSecrets[0].name)
    })

    describe('get secret', () => {
        // Act
        const secret = secretsManagerClient.getSecret(data.secretsManager.testSecrets[0].name)
        const nonExistingSecretFn = () => secretsManagerClient.getSecret('non-existing-secret')

        // Assert
        expect(secret).to.be.an('object')
        expect(secret.name).to.equal(data.secretsManager.testSecrets[0].name)
        expect(secret.secret).to.equal(data.secretsManager.testSecrets[0].secret)
        expect(nonExistingSecretFn).to.throw(SecretsManagerServiceError)
    })

    describe('create secret', () => {
        // Act
        const secret = secretsManagerClient.createSecret(
            data.secretsManager.createdSecretName,
            'created-secret-value'
        )

        // Assert
        expect(secret).to.be.an('object')
        expect(secret.name).to.equal(data.secretsManager.createdSecretName)
        expect(secret).to.not.have.property('secret', secret)
    })

    describe('put secret value', () => {
        // Act
        const secret = secretsManagerClient.putSecretValue(
            data.secretsManager.createdSecretName,
            'put-secret-value'
        )

        // Assert
        expect(secret).to.be.an('object')
        expect(secret.name).to.equal(data.secretsManager.createdSecretName)
        expect(secret).to.not.have.property('secret', secret)
    })

    describe('delete secret value', () => {
        // Act
        const deleteSecretFn = () =>
            secretsManagerClient.deleteSecret(data.secretsManager.deleteSecretName, {
                noRecovery: true,
            })

        // Assert
        expect(deleteSecretFn).to.not.throw(SecretsManagerServiceError)
    })

    // Teardown

    // Delete the secret created by the secrets manager tests.
    secretsManagerClient.deleteSecret(data.secretsManager.createdSecretName, { noRecovery: true })
}
