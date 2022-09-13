import exec from 'k6/execution'

import { AWSConfig, KMSClient } from '../build/kms.min.js'

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
})

const KMS = new KMSClient(awsConfig)
const KeyId = 'alias/TestKey'

export default function () {
    // Currently, the keys need to be created before hand

    // First let's list the keys we have available
    const keys = KMS.listKeys();
    if (!keys.length == 0) {
        exec.test.abort('test keys not found')
    }

    const key = keys.filter((s) => s.keyId === KeyId)
    if (!key) {
        exec.test.abort('target test key not found')
    }

    //Run GenerateDataKey call on the key, with the default 32 byte size
    KMS.generateDataKey(KeyId)
}
