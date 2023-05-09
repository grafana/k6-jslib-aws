import crypto from 'k6/crypto'
import exec from 'k6/execution'

import { AWSConfig, S3Client } from '../build/s3.js'

/*const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: __ENV.AWS_SESSION_TOKEN,
})*/
const awsConfig = new AWSConfig({
    region: "eu-west-3",
    accessKeyId: "ASIAZYJUID53S35IO6NP",
    secretAccessKey: "hPS0QnSHi5MiOhwSM78fvpteimg2sVlawDbCDhZ0",
    sessionToken: "IQoJb3JpZ2luX2VjEEYaCWV1LXdlc3QtMyJGMEQCIH9dP4H8wAOQ55+al+3j+8bBQVO9nO/sJaQsDFEgBDezAiAWSiTU8O1VXJtbKodtg7XCRknNvkevbi5fKK17xRJmOSrvAQhfEAAaDDY3MDY2MTM1MzMzNSIMwAsVxreryDzIE8acKswBpUzch3YqXv6Y92XscbKhlkLOwu8fSAdKC2BODF3LPpEb82I30mGxwkzY4PToMOt2htrmqGgj/MR6hyfIhKBdU/JYQGnbV045u40gS/qAvEhh69r9jKNS7UrGlrRtuKxpkQXBLIcRK+gycyJOfl5oBW4PS4HhGEWlPo3A92Xr7QSrao9P2D1sXQxEwkBHrmu49fEwf3kvkAMGrO4Sh2jRzrPOlQb+7Ql/XrNynymUpjJxSeOWByuv7OI1m0smcfpFPLNDlM0TlUMayAJmMOT946IGOpkBSUE1w+2hT2Qa1QU8gYRtmBQFMEiti9CHXwmmIjBUl1NCaekWkm4SoTX0EtBd9PjYOs2ts8m0FyuvHAt3ypTnjeciS+DQvtkS11J+w9x3QGvqBzCs+jn+jQ+7FxOPMYRpQEHULzrDQENL5o2PxNS9vdsv1KJ9ax71dUjsj2nrCTeOwldzkkiNdnUdNvx5e9BPE2bCPR+MIZ2/"
});

const s3 = new S3Client(awsConfig)

//const testBucketName = 'test-jslib-aws'
const testBucketName = 'imma-test-jslib-aws'
const testFileKey = 'multipart.txt'

export default function () {
    // List the buckets the AWS authentication configuration
    // gives us access to.
    const buckets = s3.listBuckets()

    // If our test bucket does not exist, abort the execution.
    if (buckets.filter((b) => b.name === testBucketName).length == 0) {
        exec.test.abort()
    }

    // Produce random bytes to upload of size ~12MB, that
    // we will upload in two 6MB parts. This is done as the
    // minimum part size supported by S3 is 5MB.
    const bigFile = crypto.randomBytes(12 * 1024 * 1024)

    // Initialize a multipart upload
    const multipartUpload = s3.createMultipartUpload(testBucketName, testFileKey)

    // Upload the first part
    const firstPartData = bigFile.slice(0, 6 * 1024 * 1024)
    const firstPart = s3.uploadPart(
        testBucketName,
        testFileKey,
        multipartUpload.uploadId,
        1,
        firstPartData
    )

    // Upload the second part
    const secondPartData = bigFile.slice(6 * 1024 * 1024, 12 * 1024 * 1024)
    const secondPart = s3.uploadPart(
        testBucketName,
        testFileKey,
        multipartUpload.uploadId,
        2,
        secondPartData
    )

    // Complete the multipart upload
    s3.completeMultipartUpload(testBucketName, testFileKey, multipartUpload.uploadId, [
        firstPart,
        secondPart,
    ])

    // Let's redownload it verify it's correct, and delete it
    const obj = s3.getObject(testBucketName, testFileKey)
    s3.deleteObject(testBucketName, testFileKey)
}