import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import { SQSClient } from '../../build/sqs.js'

export function sqsTestSuite(data) {
    const sqsClient = new SQSClient(data.awsConfig)
    sqsClient.host = data.awsConfig.endpoint

    let queueUrl;

    describe('list queues', () => {
        // Act
        const response = sqsClient.listQueues();

        // Assert
        expect(response.queueUrls).to.have.lengthOf(2);
        queueUrl = response.queueUrls[0];
        expect(queueUrl).to.be.a('string');
    })

    describe('send message', () => {
        // Act
        const response = sqsClient.sendMessage({
            queueUrl, messageBody: 'test'
        });

        // Assert
        expect(response.messageId).to.be.a('string');
    })

    describe('send FIFO message', () => {
        // Act
        const response = sqsClient.sendMessage({
            queueUrl, messageBody: 'test',
            messageGroupId: 'testGroupId',
            messageDeduplicationId: 'testDeduplicationId'
        });

        // Assert
        expect(response.messageId).to.be.a('string');
    })
}
