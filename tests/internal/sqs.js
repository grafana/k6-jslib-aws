import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import { SQSClient } from '../../build/sqs.js'

export function sqsTestSuite(data) {
    const sqsClient = new SQSClient(data.awsConfig)
    sqsClient.host = data.awsConfig.endpoint

    // As initialized in the setup script
    const queueUrl = 'test1';
    const fifoQueueUrl = 'test-queue.fifo';

    describe('list queues', () => {
        // Act
        const queues = sqsClient.listQueues();

        // Assert
        expect(queues.urls).to.have.lengthOf(2);

        const gotFirstQueueName = queues.urls[0].split("/").pop();
        expect(gotFirstQueueName).to.be.a('string');
        expect(gotFirstQueueName).to.equal('standard-test-queue'); // as set in init script

        const gotSecondQueueName = queues.urls[1].split("/").pop();
        expect(gotSecondQueueName).to.be.a('string');
        expect(gotSecondQueueName).to.equal('fifo-test-queue.fifo');  // as set in init script
    })

    describe('send message', () => {
        // Arrange
        const queues = sqsClient.listQueues()
        const standardQueueUrl = queues.urls[0]

        // Act
        const message = sqsClient.sendMessage(standardQueueUrl, 'test');

        // Assert
        expect(message.id).to.be.a('string');
        expect(message.bodyMD5).to.be.a('string');
        expect(message.bodyMD5).to.equal('098f6bcd4621d373cade4e832627b4f6');
    })

    describe('send FIFO message', () => {
        // Arrange
        const queues = sqsClient.listQueues()
        // This assumes the test fifo queue is created last by our initialization script
        const fifoQueueUrl = queues.urls[queues.urls.length - 1]
        
        // Act
        const message = sqsClient.sendMessage(
            fifoQueueUrl, 
            'test',
            {
                messageDeduplicationId: 'abc123',
                messageGroupId: 'easyasDoReMi',
            },
        );

        // Assert
        expect(message.id).to.be.a('string');
    })
}
