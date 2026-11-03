#!/usr/bin/env bash
set -euo pipefail

fixture_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
handler_directory="$fixture_directory/../../localstack/init/testdata/lambda"
archive_directory="$fixture_directory/lambda"
mkdir -p "$archive_directory"

for function_name in test-product test-fail; do
    zip -j -q "$archive_directory/$function_name.zip" \
        "$handler_directory/$function_name/index.js"
done
