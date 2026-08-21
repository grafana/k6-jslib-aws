#!/bin/bash

set -e

pool_id=$(awslocal cognito-idp create-user-pool \
    --pool-name "test-jslib-aws" \
    --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}' \
    --query "UserPool.Id" \
    --output text)

client_id=$(awslocal cognito-idp create-user-pool-client \
    --user-pool-id "$pool_id" \
    --client-name "test-jslib-aws" \
    --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --query "UserPoolClient.ClientId" \
    --output text)

awslocal cognito-idp admin-create-user \
    --user-pool-id "$pool_id" \
    --username "test-user" \
    --user-attributes Name=email,Value=test-user@example.com \
    --message-action SUPPRESS

awslocal cognito-idp admin-set-user-password \
    --user-pool-id "$pool_id" \
    --username "test-user" \
    --password "TestPassword1" \
    --permanent
