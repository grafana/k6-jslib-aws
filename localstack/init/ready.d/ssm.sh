#!/bin/bash

# Initialize a simple parameter to test the get operation
awslocal ssm put-parameter --name "test-parameter" --value "test-parameter-value" --type String --overwrite


# Initialize a secret parameter to test the get operation also decrypts
awslocal ssm put-parameter --name "test-parameter-secret" --value "test-parameter-secret-value" --type SecureString --overwrite
