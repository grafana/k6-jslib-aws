#!/bin/bash

testdata_folder="/etc/localstack/init/testdata/lambda"
zip_dir=/tmp/lambda
mkdir -p "$zip_dir"

for file in "$testdata_folder"/*; do
  function_name=$(basename "$file")
  function_zip="$zip_dir/$function_name.zip"
  (cd "$file" || exit; zip "$function_zip" ./*)

  awslocal lambda create-function \
      --function-name "$function_name" \
      --runtime nodejs18.x \
      --zip-file "fileb://$function_zip" \
      --handler index.handler \
      --role arn:aws:iam::000000000000:role/lambda-role
done