# k6-jslib-aws

A library allowing to interact with AWS resources for k6.io

This is an AWS client library for k6. It intends to allow interacting with a subset of AWS services in the context of k6 load test script.

## Supported features

At the moment, this library provides the following:

* `S3Client`: allows to list buckets and bucket's objects, as well as uploading, downloading, and deletion of objects.
* `SecretsManager`: allows to list, get, create, update and delete secrets from the AWS secrets manager service.
* `SQS`: allows to list queues and send messages from AWS SQS.
* `KMS`: allows to list KMS keys and generate a unique symmetric data key for use outside of AWS KMS
* `SSM`: allows to retrieve a parameter from AWS Systems Manager
* `V4 signature`: allows to sign requests to amazon AWS services

## Want to contribute?

We welcome contributions from the community! Please read our [contributing guide](CONTRIBUTING.md) and [code of conduct](CODE_OF_CONDUCT.md) before getting started.

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

### SQS

Consult the `SQSClient` [dedicated k6 documentation page](https://k6.io/docs/javascript-api/jslib/aws/sqsclient) for more details on its methods and how to use it.


```javascript
import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

import { AWSConfig, SQSClient } from 'https://jslib.k6.io/aws/0.7.0/sqs.js';

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: __ENV.AWS_SESSION_TOKEN,
});

const sqs = new SQSClient(awsConfig);
const testQueue = 'https://sqs.us-east-1.amazonaws.com/000000000/test-queue';

export default function() {
  // If our test queue does not exist, abort the execution.
  const queuesReponse = sqs.listQueues();
  if (queuesReponse.queueUrls.filter((q) => q === testQueue).length == 0) {
    exec.test.abort();
  }

  // Send message to test queue
  sqs.sendMessage({
      queueUrl: testQueue,
      messageBody: JSON.stringify({
          value: '123'
      })
  });
}
```

### KMS

Consult the `KMS` [dedicated k6 documentation page](https://k6.io/docs/javascript-api/jslib/aws/kms) for more details on its methods and how to use it.

```javascript
import exec from 'k6/execution'

import { AWSConfig, KMSClient } from '../build/kms.js'

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
})

const KMS = new KMSClient(awsConfig)
const KeyId = 'alias/TestKey'

export default function () {
    // Currently, the keys need to be created before hand

    // First let's list the keys we have available
    const keys = KMS.listKeys()
    if (keys.length == 0) {
        exec.test.abort('test keys not found')
    }

    const key = keys.filter((s) => s.keyId === KeyId)
    if (!key) {
        exec.test.abort('target test key not found')
    }

    //Run generateDataKey call on the key, with the default 32 byte size
    const dataKey = KMS.generateDataKey(key.keyId)
    if (dataKey.ciphertextBlobText == undefined) {
        exec.test.abort('data key not generated')
    }
}
```

### SSM

Consult the `SystemsManagerClient` [dedicated k6 documentation page](https://k6.io/docs/javascript-api/jslib/aws/systemsmanagerclient) for more details on its methods and how to use it.

```javascript
import exec from 'k6/execution'

import { AWSConfig, SystemsManagerClient } from '../build/ssm.js'

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: __ENV.AWS_SESSION_TOKEN,
})

const systemsManager = new SystemsManagerClient(awsConfig)
const testParameterName = 'jslib-test-parameter'
const testParameterValue = 'jslib-test-value'
const testParameterSecretName = 'jslib-test-parameter-secret'
// this value was created with --type SecureString
const testParameterSecretValue = 'jslib-test-secret-value'

export default function () {
    // Currently the parameter needs to be created before hand

    // Let's get its value
    // getParameter returns an parameter object: e.g. {parameter: {name: string, value: string...}}
    const parameter = systemsManager.getParameter(testParameterName)
    if (parameter.value !== testParameterValue) {
        exec.test.abort('test parameter not found')
    }

    // Let's get the secret value with decryption
    // destructure the parameter object to get to the values you want
    const {
        parameter: { value: encryptedParameterValue },
    } = systemsManager.getParameter(testParameterSecretName, true)
    if (encryptedParameterValue !== testParameterSecretValue) {
        exec.test.abort('encrypted test parameter not found')
    }
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
2. Use the `./build/aws.js` to make a PR to [jslib.k6.io](https://github.com/grafana/jslib.k6.io).

## Maintainers

k6-jslib-aws is developped by the k6 core development team. Maintainers of this jslib specifically are the following:

* Théo Crevon, core k6 developer [@oleiade](https://github.com/oleiade/)
