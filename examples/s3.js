import exec from 'k6/execution'

import { AWSConfig, S3Client } from '../build/s3.min.js'

const testFile = open('./bonjour.txt', 'r')

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: __ENV.AWS_SESSION_TOKEN,
})

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
