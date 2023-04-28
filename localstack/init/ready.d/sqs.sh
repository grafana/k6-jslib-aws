#!/bin/bash

awslocal sqs create-queue --queue-name standard-test-queue
awslocal sqs create-queue --queue-name fifo-test-queue.fifo --attributes FifoQueue=true