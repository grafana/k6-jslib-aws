#!/bin/bash

BUCKET="test-jslib-aws"

# The localstack container looks for scripts to execute in order
# to ingest start up data in `/docker-entrypoint-initaws.d`. As
# our script will live there, and we store test data in the same
# directory, we store its path in a variable.
testdata_folder="/docker-entrypoint-initaws.d/testdata/s3"
testdata_files="bonjour.txt tschuss.txt delete.txt"

# Create the test-jslib-aws bucket
awslocal s3api create-bucket \
    --bucket $BUCKET
if [ ${#} -ne 0 ]; then
    echo "creating bucket $BUCKET failed" > /dev/stderr
    exit 1
fi

# Add the test files to the bucket
for f in $testdata_files
do
    echo "$testdata_folder/$f"
    awslocal s3api put-object \
        --bucket $BUCKET \
        --key "$f" \
        --body "$testdata_folder/$f"
    if [ ${#} -ne 0 ]; then
        echo "putting $f object to bucket $BUCKET failed" > /dev/stderr
        exit 1
    fi
done
