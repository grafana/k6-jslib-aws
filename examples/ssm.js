import exec from 'k6/execution'

import { AWSConfig, SystemsManagerClient } from '../build/ssm.min.js'

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: __ENV.AWS_SESSION_TOKEN,
})

const systemsManager = new SystemsManagerClient(awsConfig)
const testParameterName = 'jslib-test-parameter'
const testParameterValue = 'jslib-test-value'
const testParameterSecretName = 'jslib-test-parameter-secret'
// this value was created with --type SecureString
const testParameterSecretValue = 'jslib-test-secret-value'

export default function () {
    // Currently the parameter needs to be created before hand

    // Let's get its value
    const parameter = systemsManager.getParameter(testParameterName)
    if (parameter.value !== testParameterValue) {
        exec.test.abort('test parameter not found')
    }

    // Let's get the secret value with decryption
    const encryptedParameter = systemsManager.getParameter(testParameterSecretName, true)
    if (encryptedParameter.value !== testParameterSecretValue) {
        exec.test.abort('encrypted test parameter not found')
    }
}
