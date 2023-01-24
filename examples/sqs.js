import exec from 'k6/execution'

import { AWSConfig, SQSClient } from '../build/sqs.js'

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: __ENV.AWS_SESSION_TOKEN,
})

const sqs = new SQSClient(awsConfig)
const testQueue = 'https://sqs.us-east-1.amazonaws.com/000000000/test-queue'

export default function () {
    // If our test queue does not exist, abort the execution.
    const queuesResponse = sqs.listQueues()
    if (queuesResponse.queueUrls.filter((q) => q === testQueue).length == 0) {
        exec.test.abort()
    }

    // Send message to test queue
    sqs.sendMessage({
        queueUrl: testQueue,
        messageBody: JSON.stringify({
            value: '123',
        }),
    })
}
