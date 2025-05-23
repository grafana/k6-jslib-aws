import { asyncDescribe } from "./helpers.js";
import { b64encode } from "k6/encoding";
import { ReceivedMessage, SQSClient, SQSServiceError } from "../../dist/sqs.js";

export async function sqsTestSuite(data) {
  const sqsClient = new SQSClient(data.awsConfig);
  sqsClient.host = data.awsConfig.endpoint;

  await asyncDescribe(
    "sqs.deleteMessage with invalid handle",
    async (expect) => {
      // Act
      await sqsClient.deleteMessage(data.sqs.testQueues.standard, "handle")
        .then(
          () => {
            throw new Error("Did not receive expected error");
          },
          (error) => {
            expect(error.name).to.equal("SQSServiceError");
            expect(error.message).to.equal(
              'The input receipt handle "handle" is not a valid receipt handle.',
            );
          },
        );
    },
  );

  await asyncDescribe("sqs.deleteMessage", async (expect) => {
    // Arrange
    const queueMessages = await sqsClient.receiveMessages(
      data.sqs.testQueues.deleteQueue,
      undefined,
      undefined,
      undefined,
      undefined,
      1,
    );
    expect(queueMessages).to.have.length(1);

    const gotFirstMessage = queueMessages[0];
    expect(gotFirstMessage.ReceiptHandle).to.be.a("string");

    // Act
    await sqsClient.deleteMessage(
      data.sqs.testQueues.deleteQueue,
      gotFirstMessage.ReceiptHandle,
    );
  });

  await asyncDescribe("sqs.listQueues", async (expect) => {
    // Act
    const queues = await sqsClient.listQueues();

    // Assert
    expect(queues.urls).to.have.lengthOf(5);

    const gotFirstQueueName = queues.urls[0].split("/").pop();
    expect(gotFirstQueueName).to.be.a("string");
    expect(gotFirstQueueName).to.equal("standard-test-queue"); // as set in init script

    const gotSecondQueueName = queues.urls[1].split("/").pop();
    expect(gotSecondQueueName).to.be.a("string");
    expect(gotSecondQueueName).to.equal("fifo-test-queue.fifo"); // as set in init script

    const gotThirdQueueName = queues.urls[2].split("/").pop();
    expect(gotThirdQueueName).to.be.a("string");
    expect(gotThirdQueueName).to.equal("responding-test-standard-queue"); // as set in init script

    const gotFourthQueueName = queues.urls[3].split("/").pop();
    expect(gotFourthQueueName).to.be.a("string");
    expect(gotFourthQueueName).to.equal("responding-test-queue.fifo"); // as set in init script

    const gotFifthQueueName = queues.urls[4].split("/").pop();
    expect(gotFifthQueueName).to.be.a("string");
    expect(gotFifthQueueName).to.equal("message-deletion-test-queue"); // as set in init script
  });

  await asyncDescribe(
    "sqs.receiveMessages no messages received",
    async (expect) => {
      // Act
      const messages = await sqsClient.receiveMessages(
        data.sqs.testQueues.emptyQueue,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
      );

      // Assert
      expect(messages).to.have.length(0);
    },
  );

  await asyncDescribe(
    "sqs.receiveMessages receives only one message by default",
    async (expect) => {
      // Act
      const messages = await sqsClient.receiveMessages(
        data.sqs.testQueues.fifo,
        undefined,
        undefined,
        undefined,
        0,
        1,
      );

      // Assert
      expect(messages).to.have.length(1);

      const gotFirstMessage = messages[0];
      expect(gotFirstMessage).to.be.instanceOf(ReceivedMessage);
      expect(gotFirstMessage.Body).to.equal("Goodbye, AWS!");
    },
  );

  await asyncDescribe(
    "sqs.receiveMessages up to ten messages",
    async (expect) => {
      // Act
      const messages = await sqsClient.receiveMessages(
        data.sqs.testQueues.fifo,
        ["ANY"],
        ["ANY"],
        10,
        0,
        1,
      );

      // Assert
      expect(messages).to.have.length(2);

      const gotFirstMessage = messages[0];
      expect(gotFirstMessage).to.be.instanceOf(ReceivedMessage);
      expect(gotFirstMessage.Body).to.equal("Goodbye, AWS!");

      const gotSecondMessage = messages[1];
      expect(gotSecondMessage).to.be.instanceOf(ReceivedMessage);
      expect(gotSecondMessage.Body).to.equal("Farewell, cloud!");
    },
  );

  await asyncDescribe(
    "sqs.receiveMessages from standard queue",
    async (expect) => {
      // Act
      const messages = await sqsClient.receiveMessages(
        data.sqs.testQueues.standard,
      );

      // Assert
      expect(messages).to.have.length(1);

      const gotFirstMessage = messages[0];
      expect(gotFirstMessage.Body).to.equal("Hello, k6!");
    },
  );

  await asyncDescribe("sqs.sendMessage", async (expect) => {
    // Arrange
    const queues = await sqsClient.listQueues();
    const standardQueueUrl = queues.urls[0];

    // Act
    const message = await sqsClient.sendMessage(standardQueueUrl, "test");

    // Assert
    expect(message.id).to.be.a("string");
    expect(message.bodyMD5).to.be.a("string");
    expect(message.bodyMD5).to.equal("098f6bcd4621d373cade4e832627b4f6");
  });

  await asyncDescribe("sqs.sendMessageWithAttributes", async (expect) => {
    // Arrange
    const queues = await sqsClient.listQueues();
    const standardQueueUrl = queues.urls[0];

    // Act
    const message = await sqsClient.sendMessage(standardQueueUrl, "test", {
      messageAttributes: {
        "test-string": {
          type: "String",
          value: "test",
        },
        "test-number": {
          type: "Number",
          value: "23",
        },
        "test-binary": {
          type: "Binary",
          value: b64encode("test"),
        },
      },
    });

    // Assert
    expect(message.id).to.be.a("string");
  });

  await asyncDescribe("sqs.sendFIFOMessage", async (expect) => {
    // Arrange
    const queues = await sqsClient.listQueues();
    // If we did not receive the URL, no sense trying.
    expect(queues.urls).to.include(data.sqs.testQueues.fifoQueueSend);

    // Act
    const message = await sqsClient.sendMessage(
      data.sqs.testQueues.fifoQueueSend,
      "test",
      {
        messageDeduplicationId: "abc123",
        messageGroupId: "easyasDoReMi",
      },
    );

    // Assert
    expect(message.id).to.be.a("string");
  });

  await asyncDescribe(
    "sqs.sendMessage to non-existent queue",
    async (expect) => {
      // Arrange
      let sendMessageToNonExistentQueueError;
      try {
        await sqsClient.sendMessage("non-existent", "value");
      } catch (error) {
        sendMessageToNonExistentQueueError = error;
      }

      // Assert
      expect(sendMessageToNonExistentQueueError).to.not.be.undefined;
      expect(sendMessageToNonExistentQueueError).to.be.an.instanceOf(
        SQSServiceError,
      );
    },
  );

  await asyncDescribe("sqs.sendMessageBatch successful", async (expect) => {
    // Arrange
    const queues = await sqsClient.listQueues();
    const standardQueueUrl = queues.urls[0];
    const messageBatch = [
      { messageId: "0", messageBody: "test0" },
      { messageId: "1", messageBody: "test1" },
    ];

    // Act
    const messageBatchResponse = await sqsClient.sendMessageBatch(
      standardQueueUrl,
      messageBatch,
    );

    // Assert
    const test0Md5 = "f6f4061a1bddc1c04d8109b39f581270";
    const test1Md5 = "5a105e8b9d40e1329780d62ea2265d8a";

    expect(messageBatchResponse.successful).to.have.length(2);
    expect(messageBatchResponse.successful[0].id).to.be.a("string");
    expect(messageBatchResponse.successful[0].bodyMD5).to.equal(test0Md5);

    expect(messageBatchResponse.successful[1].id).to.be.a("string");
    expect(messageBatchResponse.successful[1].bodyMD5).to.equal(test1Md5);
  });

  await asyncDescribe(
    "sqs.sendMessageBatch ids not distinct",
    async (expect) => {
      // Arrange
      const queues = await sqsClient.listQueues();
      const standardQueueUrl = queues.urls[0];
      const messageBatch = [
        { messageId: "0", messageBody: "test0" },
        { messageId: "0", messageBody: "test0" },
      ];

      let batchEntryIdsNotDistinctError;
      try {
        // Act
        await sqsClient.sendMessageBatch(standardQueueUrl, messageBatch);
      } catch (error) {
        batchEntryIdsNotDistinctError = error;
      }

      // Assert
      expect(batchEntryIdsNotDistinctError).to.not.be.undefined;
      expect(batchEntryIdsNotDistinctError).to.be.an.instanceOf(
        SQSServiceError,
      );
    },
  );
}
