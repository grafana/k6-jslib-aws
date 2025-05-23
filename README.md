# k6-jslib-aws

A library enabling users to interact with AWS resources within k6 scripts.

This AWS client library for k6 facilitates interactions with a subset of AWS services in the context of k6 load testing scripts.

Extensive documentation and examples for each of these clients can be found in the [k6 documentation](https://grafana.com/docs/k6/latest/javascript-api/jslib/aws/). Please refer to the documentation for detailed information on how to use the library.

## Supported services and features

-   [`EventBridge`](https://grafana.com/docs/k6/latest/javascript-api/jslib/aws/eventbridgeclient/): allows to put events to AWS EventBridge.
-   [`Kinesis`](./examples/kinesis.js): allows to list streams, create streams, put records, list shards, get shard iterators, and get records from AWS Kinesis.
-   [`KMS`](https://grafana.com/docs/k6/latest/javascript-api/jslib/aws/kmsclient/): allows to list KMS keys and generate a unique symmetric data key for use outside of AWS KMS
-   [`Lambda`](./examples/lambda.js): allows to invoke functions in AWS Lambda.
-   [`S3Client`](https://grafana.com/docs/k6/latest/javascript-api/jslib/aws/s3client/): allows to list buckets and bucket's objects, as well as uploading, downloading, and deletion of objects.
-   [`SecretsManager`](https://grafana.com/docs/k6/latest/javascript-api/jslib/aws/secretsmanagerclient/): allows to list, get, create, update and delete secrets from the AWS secrets manager service.
-   [`SQS`](https://grafana.com/docs/k6/latest/javascript-api/jslib/aws/sqsclient/): allows to list queues and send messages from AWS SQS.
-   [`SSM`](https://grafana.com/docs/k6/latest/javascript-api/jslib/aws/systemsmanagerclient/): allows to retrieve a parameter from AWS Systems Manager
-   [`V4 signature`](https://grafana.com/docs/k6/latest/javascript-api/jslib/aws/signaturev4/): allows to sign requests to amazon AWS services

## Demo

```javascript
import { check } from 'k6'
import exec from 'k6/execution'
import http from 'k6/http'

import { AWSConfig, S3Client } from 'https://jslib.k6.io/aws/0.14.0/s3.js'

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
})

const s3 = new S3Client(awsConfig)
const testBucketName = 'test-jslib-aws'
const testInputFileKey = 'productIDs.json'
const testOutputFileKey = `results-${Date.now()}.json`

export async function setup() {
    // If our test bucket does not exist, abort the execution.
    const buckets = await s3.listBuckets()
    if (buckets.filter((b) => b.name === testBucketName).length == 0) {
        exec.test.abort()
    }

    // If our test object does not exist, abort the execution.
    const objects = await s3.listObjects(testBucketName)
    if (objects.filter((o) => o.key === testInputFileKey).length == 0) {
        exec.test.abort()
    }

    // Download the S3 object containing our test data
    const inputObject = await s3.getObject(testBucketName, testInputFileKey)

    // Let's return the downloaded S3 object's data from the
    // setup function to allow the default function to use it.
    return {
        productIDs: JSON.parse(inputObject.data),
    }
}

export default async function (data) {
    // Pick a random product ID from our test data
    const randomProductID = data.productIDs[Math.floor(Math.random() * data.productIDs.length)]

    // Query our ecommerce website's product page using the ID
    const res = await http.asyncRequest(
        'GET',
        `http://your.website.com/product/${randomProductID}/`
    )
    check(res, { 'is status 200': res.status === 200 })
}

export async function handleSummary(data) {
    // Once the load test is over, let's upload the results to our
    // S3 bucket. This is executed after teardown.
    await s3.putObject(testBucketName, testOutputFileKey, JSON.stringify(data))
}
```

## Want to contribute?

The scope of this library is intentionally minimal, focusing on the use cases needed by us and our clients. If the library doesn't yet meet your needs, feel free to extend it and open a pull request. Contributions are welcome.

### Build

```bash
# Bundle the library in preparation for publication
deno task build

# Run the tests
deno task test
```

For more details, refer to [CONTRIBUTING.md](./CONTRIBUTING.md).
