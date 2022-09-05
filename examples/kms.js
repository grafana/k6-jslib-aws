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
    //Run GenerateDataKey call on the key, with the default 32 byte size
    KMS.generateDataKey(KeyId)
}
