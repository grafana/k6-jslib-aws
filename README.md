# k6-jslib-aws

A library enabling users to interact with AWS resources for k6.io

This is an AWS client library for k6. It intends to allow interacting with a subset of AWS services in the context of k6 load test script.

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

## Want to contribute?

We welcome contributions from the community! Please read our [contributing guide](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md) before getting started.

## Demo

```javascript
import { check } from 'k6'
import exec from 'k6/execution'
import http from 'k6/http'

import { AWSConfig, S3Client } from 'https://jslib.k6.io/aws/0.11.0/s3.js'

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

## Development

### Contributing

The scope of this library has been kept minimal and limited to the use cases we, and our clients, need. If the library doesn't cater to your needs just yet, feel free to add it, and open a pull-request. We welcome contributions.

### Build

```bash
# Install the local dependencies
npm install

# Bundle it in preparation for a publication
npm run webpack

# Run the tests
npm test
```

For further details, take a look at [CONTRIBUTING.md](CONTRIBUTING.md).

## Maintainers

k6-jslib-aws is developped by the k6 core development team. Maintainers of this jslib specifically are the following:

-   Théo Crevon, core k6 developer [@oleiade](https://github.com/oleiade/)
