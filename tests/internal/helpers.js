import { expect } from "https://jslib.k6.io/k6chaijs/4.3.4.1/index.js";
import { check } from "k6";

/*
 * asyncDescribe is a helper function that allows us to use async/await
 * in our tests.
 *
 * As of this writing k6 chai relies on the `group` function which does
 * not support being called in an asynchronous context yet.
 *
 * This function facilitates the writing of tests like this:
 *
 * asyncDescribe('S3.listObjects', async (expect) => {
 *     const objects = await s3Client.listObjects(data.s3.testBucketName)
 *     expect(objects).to.be.an('array')
 * })
 *
 * In this scenario, the tests will not be grouped in the output. Instead, they will be
 * prefixed with the provided description. Therefore, it enables the execution of asynchronous
 * operations within tests, but it comes at the cost of losing tests grouping in the test output.
 *
 * @param {string} description - A string that describes the test suite.
 * This description will be prepended to the description of each individual test.
 *
 * @param {function} callback - The callback function that encapsulates the test scenario.
 * This function will be called with the `expect` function as its first argument.
 *
 * @example
 * ```
 * asyncDescribe('s3.completeMultipartUpload', async (expect) => {
 *    // Arrange step
 *    const multipartUpload = await s3Client.createMultipartUpload(
 *        data.s3.testBucketName,
 *        'created-by-test.txt'
 *    )
 *    // Act step
 *    let completeMultipartUploadError;
 *    try {
 *        await s3Client.completeMultipartUpload(
 *            data.s3.testBucketName,
 *            multipartUpload.key,
 *            multipartUpload.uploadId,
 *            [uploadPart]
 *        )
 *    } catch (error) {
 *        completeMultipartUploadError = error;
 *    }
 *    // Assert step
 *    expect(completeMultipartUploadError).to.be.undefined
 * })
 * ```
 */
export async function asyncDescribe(description, callback) {
  try {
    await callback((what) => {
      return expect(what, description);
    });
  } catch (error) {
    if (error.name !== "AssertionError") {
      console.error(`FAIL [${description}]`, error.stack);
      check(error, { [description]: () => false });
    } else {
      console.error(`FAIL [${description}]`, error.message);
    }
  }
}
