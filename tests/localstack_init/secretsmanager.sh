#!/bin/bash

# Initialize a secret to test the list operation
awslocal secretsmanager create-secret --name "test-secret" --secret-string "test-secret-value"

# Initialize a secret to test the delete operation
awslocal secretsmanager create-secret --name "test-delete-secret" --secret-string "test-delete-secret-value"