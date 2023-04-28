#!/bin/bash

awslocal kms create-key \
        --description "test key" \
        --tags TagKey=Name,TagValue=test-key \
        --query "KeyMetadata.KeyId"
if [ ${#} -ne 0 ]; then
    echo "creating key failed" > /dev/stderr
    exit 1
fi

keyid=$(awslocal kms list-keys --query "Keys[0].KeyId" | tr -d '"')

awslocal kms create-alias \
    --alias-name "alias/test-key" \
    --target-key-id "$keyid"
if [ ${#} -ne 0 ]; then
    echo "creating alias failed" > /dev/stderr
    exit 1
fi
