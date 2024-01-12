import { asyncDescribe } from './helpers.js'
import { b64encode } from 'k6/encoding'
import { SQSClient, SQSServiceError } from '../../dist/sqs.js'

export async function sqsTestSuite(data) {
    const sqsClient = new SQSClient(data.awsConfig)
    sqsClient.host = data.awsConfig.endpoint

    await asyncDescribe('sqs.listQueues', async (expect) => {
        // Act
        const queues = await sqsClient.listQueues()

        // Assert
        expect(queues.urls).to.have.lengthOf(2)

        const gotFirstQueueName = queues.urls[0].split('/').pop()
        expect(gotFirstQueueName).to.be.a('string')
        expect(gotFirstQueueName).to.equal('standard-test-queue') // as set in init script

        const gotSecondQueueName = queues.urls[1].split('/').pop()
        expect(gotSecondQueueName).to.be.a('string')
        expect(gotSecondQueueName).to.equal('fifo-test-queue.fifo') // as set in init script
    })

    await asyncDescribe('sqs.sendMessage', async (expect) => {
        // Arrange
        const queues = await sqsClient.listQueues()
        const standardQueueUrl = queues.urls[0]

        // Act
        const message = await sqsClient.sendMessage(standardQueueUrl, 'test')

        // Assert
        expect(message.id).to.be.a('string')
        expect(message.bodyMD5).to.be.a('string')
        expect(message.bodyMD5).to.equal('098f6bcd4621d373cade4e832627b4f6')
    })

    await asyncDescribe('sqs.sendMessageWithAttributes', async (expect) => {
        // Arrange
        const queues = await sqsClient.listQueues()
        const standardQueueUrl = queues.urls[0]

        // Act
        const message = await sqsClient.sendMessage(standardQueueUrl, 'test', {
            messageAttributes: {
                'test-string': {
                    type: 'String',
                    value: 'test'
                },
                'test-number': {
                    type: 'Number',
                    value: '23'
                },
                'test-binary': {
                    type: 'Binary',
                    value: b64encode('test')
                }
            }
        })

        // Assert
        expect(message.id).to.be.a('string')
    })

    await asyncDescribe('sqs.sendFIFOMessage', async (expect) => {
        // Arrange
        const queues = await sqsClient.listQueues()
        // This assumes the test fifo queue is created last by our initialization script
        const fifoQueueUrl = queues.urls[queues.urls.length - 1]

        // Act
        const message = await sqsClient.sendMessage(fifoQueueUrl, 'test', {
            messageDeduplicationId: 'abc123',
            messageGroupId: 'easyasDoReMi',
        })

        // Assert
        expect(message.id).to.be.a('string')
    })

    await asyncDescribe('sqs.sendMessage to non-existent queue', async (expect) => {
        // Arrange
        let sendMessageToNonExistentQueueError
        try {
            await sqsClient.sendMessage('non-existent', 'value')
        } catch (error) {
            sendMessageToNonExistentQueueError = error
        }

        // Assert
        expect(sendMessageToNonExistentQueueError).to.not.be.undefined
        expect(sendMessageToNonExistentQueueError).to.be.an.instanceOf(SQSServiceError)
    })
}
