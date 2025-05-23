import exec from "k6/execution";

import { AWSConfig, S3Client } from "../dist/s3.js";

const testFile = open("./bonjour.txt", "r");

const awsConfig = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  sessionToken: __ENV.AWS_SESSION_TOKEN,
});

const s3 = new S3Client(awsConfig);

const testBucketName = "test-jslib-aws";
const testFileKey = "bonjour.txt";

export default async function () {
  // List the buckets the AWS authentication configuration
  // gives us access to.
  const buckets = await s3.listBuckets();

  // If our test bucket does not exist, abort the execution.
  if (buckets.filter((b) => b.name === testBucketName).length == 0) {
    exec.test.abort();
  }

  // Let's upload our test file to the bucket
  await s3.putObject(testBucketName, testFileKey, testFile);

  // Let's list the test bucket objects
  const objects = await s3.listObjects(testBucketName);

  // And verify it does contain our test object
  if (objects.filter((o) => o.key === testFileKey).length == 0) {
    exec.test.abort();
  }

  // Let's redownload it, verify it's correct, and delete it
  await s3.getObject(testBucketName, testFileKey);
  await s3.deleteObject(testBucketName, testFileKey);
}
