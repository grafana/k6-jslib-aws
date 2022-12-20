import { describe } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import { SqsClient } from '../../build/sqs.min.js'

export function sqsTestSuite(data) {
    const sqsClient = new SqsClient(data.awsConfig)
    sqsClient.host = data.awsConfig.endpoint

    let queueUrl;

    describe('list queues', () => {
        const firstQueues = sqsClient.listQueues();
        queueUrl = firstQueues.queues[0];
    })

    describe('send message', () => {
        sqsClient.sendMessage({
            queueUrl, messageBody: 'test'
        })
    })
}
