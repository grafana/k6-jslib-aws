#!/bin/bash

awslocal dynamodb create-table \
  --table-name test-jslib-aws-table \
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

awslocal dynamodb put-item \
  --table-name test-jslib-aws-table \
  --item '{"pk": {"S": "tenant#1"}, "sk": {"S": "item#1"}, "value": {"S": "alpha"}}'

awslocal dynamodb put-item \
  --table-name test-jslib-aws-table \
  --item '{"pk": {"S": "tenant#1"}, "sk": {"S": "item#2"}, "value": {"S": "beta"}}'

awslocal dynamodb put-item \
  --table-name test-jslib-aws-table \
  --item '{"pk": {"S": "tenant#2"}, "sk": {"S": "item#1"}, "value": {"S": "gamma"}}'

awslocal dynamodb put-item \
  --table-name test-jslib-aws-table \
  --item '{"pk": {"S": "tenant#1"}, "sk": {"S": "item#update"}, "value": {"S": "original"}}'

awslocal dynamodb put-item \
  --table-name test-jslib-aws-table \
  --item '{"pk": {"S": "tenant#1"}, "sk": {"S": "item#delete"}, "value": {"S": "to-delete"}}'
