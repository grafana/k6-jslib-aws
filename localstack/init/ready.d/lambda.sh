#!/bin/bash

FUNCTION_NAME="test-jslib-aws-lambda"

# Create a dummy lambda function responding with a static string "Hello World!"
cat >index.js <<EOF
exports.handler = async function(event, context) {
    return "Hello World!";
}
EOF

# Create a zip file containing the lambda function
zip lambda.zip index.js

# Create a dummy lambda function responding with a static string "Hello World!"
awslocal lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs18.x \
    --handler index.handler \
    --zip-file fileb://lambda.zip \
    --role arn:aws:iam::123456789012:role/irrelevant