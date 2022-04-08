# k6-jslib-aws

A library allowing to interact with AWS resources for k6.io

This is an AWS client library for k6. It intends to allow interacting with a subset of AWS services in the context of k6 load test script.

## Supported features

At the moment, this library provides the following:
* `S3Client`: allows to list buckets and bucket's objects, as well as uploading, downloading, and deletion of objects.
* `V4 signature`: allows to sign requests to amazon AWS services 

## Demo

### S3

```javascript
import exec from 'k6/execution'

import {
    // listBuckets,
    AWSConfig,
    S3Client,
} from 'https://jslib.k6.io/aws/0.1.0/index.js'

const testFile = open('./bonjour.txt', 'r')

const awsConfig = new AWSConfig(
    __ENV.AWS_REGION,
    __ENV.AWS_ACCESS_KEY_ID,
    __ENV.AWS_SECRET_ACCESS_KEY
)

const s3 = new S3Client(awsConfig)

const testBucketName = 'test-jslib-aws'
const testFileKey = 'bonjour.txt'

export default function () {
    // List the buckets the AWS authentication configuration
    // gives us access to.
    const buckets = s3.listBuckets()

    // If our test bucket does not exist, abort the execution.
    if (buckets.filter((b) => b.name === testBucketName).length == 0) {
        exec.test.abort()
    }

    // Let's upload our test file to the bucket
    s3.putObject(testBucketName, testFileKey, testFile)

    // Let's list the test bucket objects
    const objects = s3.listObjects(testBucketName)

    // And verify it does contain our test object
    if (objects.filter((o) => o.key === testFileKey).length == 0) {
        exec.test.abort()
    }

    // Let's redownload it verify it's correct, and delete it
    const obj = s3.getObject(testBucketName, testFileKey)
    s3.deleteObject(testBucketName, testFileKey)
}

```

## Development

### Contributing

The scope of this library has been kept quite small and limited to the use cases we, and our clients need. If the library doesn't catter to your needs just yet, feel free to add it, and open a pull-request. We welcome contributions.

### Build

```bash
# Install the local dependencies
npm install

# Bundle it in preparation for a publication
npm run-script webpack

# Run the tests
npm test
```

### Deploying new versions
1. Build.
2. Use the `./build/aws.min.js` to make a PR to [jslib.k6.io](https://github.com/grafana/jslib.k6.io). 
## Maintainers

k6-jslib-aws is developped by the k6 core development team. Maintainers of this jslib specifically are the following:
* Théo Crevon, core k6 developer [@oleiade](https://github.com/oleiade/)
