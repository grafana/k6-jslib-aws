#!/bin/bash

BUCKET="test-jslib-aws"

testdata_folder="/docker-entrypoint-initaws.d/testdata"

# Create the test-jslib-aws bucket
awslocal s3api create-bucket \
    --bucket $BUCKET
if [ ${#} -ne 0 ]; then
    exit 1
fi

# Add the test files to the bucket
for f in "bonjour.txt" "tschuss.txt" "delete.txt"
do
    awslocal s3api put-object \
        --bucket $BUCKET \
        --key $f \
        --body "$testdata_folder/$f"
    if [ ${#} -ne 0 ]; then
        exit 1
    fi
done
