import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import { AWSConfig, S3Client, S3ServiceError } from '../../build/s3.js'

export function s3TestSuite(data) {
    const s3Client = new S3Client(data.awsConfig)
    s3Client.host = `s3.${data.awsConfig.endpoint}`

    describe('list buckets', () => {
        // Act
        const buckets = s3Client.listBuckets()

        // Assert
        expect(buckets).to.be.an('array')
        expect(buckets).to.have.lengthOf(1)
        expect(buckets[0].name).to.equal(data.s3.testBucketName)
    })

    describe('list objects', () => {
        // Act
        const objects = s3Client.listObjects(data.s3.testBucketName)

        // Assert
        expect(objects).to.be.an('array')
        expect(objects).to.have.lengthOf(3)
        expect(objects[0].key).to.equal('bonjour.txt')
        expect(objects[1].key).to.equal('delete.txt')
        expect(objects[2].key).to.equal('tschuss.txt')
    })

    describe('get object', () => {
        // Arrange
        const getObjectFromNonExistingBucketFn = () =>
            s3Client.getObject('non-existent-bucket', data.s3.testObjects[0].key)
        const getNonExistingObjectFn = () =>
            s3Client.getObject(data.s3.testBucketName, 'non-existent-object.txt')

        // Act
        const gotFirstObject = s3Client.getObject(
            data.s3.testBucketName,
            data.s3.testObjects[0].key
        )
        const gotSecondObject = s3Client.getObject(
            data.s3.testBucketName,
            data.s3.testObjects[1].key
        )

        // Assert
        expect(gotFirstObject).to.be.an('object')
        expect(gotFirstObject.key).to.equal(data.s3.testObjects[0].key)
        expect(gotFirstObject.body).to.equal(data.s3.testObjects[0].data)
        expect(gotSecondObject).to.be.an('object')
        expect(gotSecondObject.key).to.equal(data.s3.testObjects[1].key)
        expect(gotSecondObject.body).to.equal(data.s3.testObjects[1].data)
        expect(getNonExistingObjectFn).to.throw(S3ServiceError)
        expect(getObjectFromNonExistingBucketFn).to.throw(S3ServiceError)
    })

    describe('put object', () => {
        // Arrange
        const putNonExistingObjectFn = () =>
            s3Client.putObject(
                data.s3.testBucketName,
                'created-by-test.txt',
                'This file was created by a test'
            )

        // Assert
        expect(putNonExistingObjectFn).to.not.throw()
    })

    describe('deleteObject', () => {
        // Arrange
        const deleteExistingObjectFn = () =>
            s3Client.deleteObject(data.s3.testBucketName, data.s3.testObjects[2].key)
        const deleteFromNonExistingBucketFn = () => {
            s3Client.deleteObject('non-existent-bucket', data.s3.testObjects[2].key)
        }
        const deleteNonExistingObjectFn = () =>
            s3Client.deleteObject(data.s3.testBucketName, 'non-existent-object.txt')

        // Assert
        expect(deleteExistingObjectFn).to.not.throw()
        expect(deleteNonExistingObjectFn).to.not.throw()
        expect(deleteFromNonExistingBucketFn).to.throw(S3ServiceError)
    })

    // Teardown
    // Ensure to cleanup the file create by the s3 tests.
    s3Client.deleteObject(data.s3.testBucketName, 'created-by-test.txt')

    // Ensure the object used to test deletion is recreated
    s3Client.putObject(
        data.s3.testBucketName,
        data.s3.testObjects[2].key,
        data.s3.testObjects[2].body
    )
}
