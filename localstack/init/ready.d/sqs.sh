#!/bin/bash

awslocal sqs create-queue --queue-name standard-test-queue
awslocal sqs create-queue --queue-name fifo-test-queue.fifo --attributes FifoQueue=true

awslocal sqs create-queue --queue-name responding-test-standard-queue
awslocal sqs send-message \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/responding-test-standard-queue \
  --message-body "Hello, k6!"

awslocal sqs create-queue --queue-name responding-test-queue.fifo --attributes FifoQueue=true
awslocal sqs send-message \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/responding-test-queue.fifo \
  --message-body "Goodbye, AWS!" --message-group-id "1" --message-deduplication-id "123"

awslocal sqs send-message \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/responding-test-queue.fifo \
  --message-body "Farewell, cloud!" --message-group-id "1" --message-deduplication-id "1231"

awslocal sqs create-queue --queue-name message-deletion-test-queue
awslocal sqs send-message \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/message-deletion-test-queue \
  --message-body "See you later"