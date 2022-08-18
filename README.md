# k6-jslib-aws

A library allowing to interact with AWS resources for k6.io

This is an AWS client library for k6. It intends to allow interacting with a subset of AWS services in the context of k6 load test script.

## Supported features

At the moment, this library provides the following:
* `S3Client`: allows to list buckets and bucket's objects, as well as uploading, downloading, and deletion of objects.
* `SecretsManager`: allows to list, get, create, update and delete secrets from the AWS secrets manager service.
* `V4 signature`: allows to sign requests to amazon AWS services 

## Demo

### S3

Consult the `S3Client` [dedicated k6 documentation page](https://k6.io/docs/javascript-api/jslib/aws/s3client) for more details on its methods and how to use it.   

### Practical example

```javascript
import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

import { AWSConfig, S3Client } from 'https://jslib.k6.io/aws/0.4.0/s3.js';

const awsConfig = new AWSConfig(
  __ENV.AWS_REGION,
  __ENV.AWS_ACCESS_KEY_ID,
  __ENV.AWS_SECRET_ACCESS_KEY
);

const s3 = new S3Client(awsConfig);
const testBucketName = 'test-jslib-aws';
const testInputFileKey = 'productIDs.json';
const testOutputFileKey = `results-${Date.now()}.json`;

export function setup() {
  // If our test bucket does not exist, abort the execution.
  const buckets = s3.listBuckets();
  if (buckets.filter((b) => b.name === testBucketName).length == 0) {
    exec.test.abort();
  }

  // If our test object does not exist, abort the execution.
  const objects = s3.listObjects(testBucketName);
  if (objects.filter((o) => o.key === testInputFileKey).length == 0) {
    exec.test.abort();
  }

  // Download the S3 object containing our test data
  const inputObject = s3.getObject(testBucketName, testInputFileKey);

  // Let's return the downloaded S3 object's data from the
  // setup function to allow the default function to use it.
  return {
    productIDs: JSON.parse(inputObject.data),
  };
}

export default function (data) {
  // Pick a random product ID from our test data
  const randomProductID = data.productIDs[Math.floor(Math.random() * data.productIDs.length)];

  // Query our ecommerce website's product page using the ID
  const res = http.get(`http://your.website.com/product/${randomProductID}/`);
  check(res, { 'is status 200': res.status === 200 });
}

export function handleSummary(data) {
  // Once the load test is over, let's upload the results to our
  // S3 bucket. This is executed after teardown.
  s3.putObject(testBucketName, testOutputFileKey, JSON.stringify(data));
}
```

### Secrets Manager

Consult the `SecretsManagerClient` [dedicated k6 documentation page](https://k6.io/docs/javascript-api/jslib/aws/secretsmanagerclient) for more details on its methods and how to use it. 

```javascript
import exec from 'k6/execution'

import { AWSConfig, SecretsManagerClient } from 'https://jslib.k6.io/aws/0.4.0/secrets-manager.js'

const awsConfig = new AWSConfig(
    __ENV.AWS_REGION,
    __ENV.AWS_ACCESS_KEY_ID,
    __ENV.AWS_SECRET_ACCESS_KEY
)

const secretsManager = new SecretsManagerClient(awsConfig)
const testSecretName = 'jslib-test-secret'
const testSecretValue = 'jslib-test-value'

export default function () {
    // Let's make sure our test secret is created
    const testSecret = secretsManager.createSecret(
        testSecretName,
        testSecretValue,
        'this is a test secret, delete me.'
    )

    // List the secrets the AWS authentication configuration
    // gives us access to, and verify the creation was successful.
    const secrets = secretsManager.listSecrets()
    if (!secrets.filter((s) => s.name === testSecret.name).length == 0) {
        exec.test.abort('test secret not found')
    }

    // Now that we know the secret exist, let's update its value
    const newTestSecretValue = 'new-test-value'
    secretsManager.putSecretValue(testSecretName, newTestSecretValue)

    // Let's get its value and verify it was indeed updated
    const updatedSecret = secretsManager.getSecret(testSecretName)
    if (updatedSecret.secretString !== newTestSecretValue) {
        exec.test.abort('unable to update test secret')
    }

    // Finally, let's delete our test secret and verify it worked
    secretsManager.deleteSecret(updatedSecret.name, { noRecovery: true })
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
