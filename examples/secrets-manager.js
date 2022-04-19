import exec from 'k6/execution'

import { AWSConfig, SecretsManagerClient } from '../build/secrets-manager.min.js'

const awsConfig = new AWSConfig(
    __ENV.AWS_REGION,
    __ENV.AWS_ACCESS_KEY_ID,
    __ENV.AWS_SECRET_ACCESS_KEY
)

const secretsManager = new SecretsManagerClient(awsConfig)
const testSecretName = 'jslib-test-secret'
const testSecretValue = 'jslib-test-value'

export default function () {
    // Let's make sure our test secret is created
    const testSecret = secretsManager.createSecret(
        testSecretName,
        testSecretValue,
        'this is a test secret, delete me.'
    )

    // List the secrets the AWS authentication configuration
    // gives us access to, and verify the creation was successful.
    const secrets = secretsManager.listSecrets()
    if (!secrets.filter((s) => s.name === testSecret.name).length == 0) {
        exec.test.abort('test secret not found')
    }

    // Now that we know the secret exist, let's update its value
    const newTestSecretValue = 'new-test-value'
    const u = secretsManager.putSecretValue(testSecretName, newTestSecretValue)

    // Let's get its value and verify it was indeed updated
    const updatedSecret = secretsManager.getSecret(testSecretName)
    if (updatedSecret.secret !== newTestSecretValue) {
        exec.test.abort('unable to update test secret')
    }

    // Finally, let's delete our test secret and verify it worked
    secretsManager.deleteSecret(updatedSecret.name, { noRecovery: true })
}
