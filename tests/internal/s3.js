import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import { AWSConfig, S3Client, S3ServiceError } from '../../build/s3.js'

export function s3TestSuite(data) {
    const s3Client = new S3Client(data.awsConfig)
    s3Client.host = `s3.${data.awsConfig.endpoint}`
    s3Client.scheme = `https`

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
        expect(gotFirstObject.data).to.equal(data.s3.testObjects[0].body)
        expect(gotSecondObject).to.be.an('object')
        expect(gotSecondObject.key).to.equal(data.s3.testObjects[1].key)
        expect(gotSecondObject.data).to.equal(data.s3.testObjects[1].body)
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

    describe('copy object', () => {
        // Arrange
        const sourceObject = data.s3.testObjects[0]
        const sourceKey = sourceObject.key
        const destinationKey = sourceKey + '-new'
        const bucket = data.s3.testBucketName

        // Act
        s3Client.copyObject(bucket, sourceKey, bucket, destinationKey)
        const newObject = s3Client.getObject(bucket, destinationKey)

        // Assert
        expect(newObject).to.be.an('object')
        expect(newObject.key).to.equal(destinationKey)
        expect(newObject.data).to.equal(sourceObject.body)
    })

    describe('create multipart upload', () => {
        // Arrange
        const createMultipartUploadFn = () =>
            s3Client.createMultipartUpload(data.s3.testBucketName, 'created-by-test.txt')

        // Assert
        expect(createMultipartUploadFn).to.not.throw()
    })

    describe('upload part', () => {
        // Arrange
        const multipartUpload = s3Client.createMultipartUpload(
            data.s3.testBucketName,
            'created-by-test.txt'
        )
        const uploadPartFn = () =>
            s3Client.uploadPart(
                data.s3.testBucketName,
                multipartUpload.key,
                multipartUpload.uploadId,
                1,
                'This file was created by a test'
            )
        const uploadPartNonExistingMultipartUploadIdFn = () =>
            s3Client.uploadPart(
                data.s3.testBucketName,
                multipartUpload.key,
                'non-existent-upload-id',
                1,
                'This file was created by a test'
            )

        // Assert
        expect(uploadPartFn).to.not.throw()
        expect(uploadPartNonExistingMultipartUploadIdFn).to.throw(S3ServiceError)
    })

    describe('complete multipart upload', () => {
        // Arrange
        const multipartUpload = s3Client.createMultipartUpload(
            data.s3.testBucketName,
            'created-by-test.txt'
        )
        const uploadPart = s3Client.uploadPart(
            data.s3.testBucketName,
            multipartUpload.key,
            multipartUpload.uploadId,
            1,
            'This file was created by a test'
        )
        const completeMultipartUploadFn = () =>
            s3Client.completeMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                multipartUpload.uploadId,
                [uploadPart]
            )
        const completeMultipartUploadNonExistingMultipartUploadIdFn = () =>
            s3Client.completeMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                'non-existent-upload-id',
                [uploadPart]
            )
        const completeMultipartUploadNonExistingPartFn = () =>
            s3Client.completeMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                multipartUpload.uploadId,
                [{ partNumber: 2, etag: 'non-existent-etag' }]
            )

        // Assert
        expect(completeMultipartUploadFn).to.not.throw()
        expect(completeMultipartUploadNonExistingMultipartUploadIdFn).to.throw(S3ServiceError)
        expect(completeMultipartUploadNonExistingPartFn).to.throw(S3ServiceError)
    })

    describe('abort multipart upload', () => {
        // Arrange
        const multipartUpload = s3Client.createMultipartUpload(
            data.s3.testBucketName,
            'created-by-test.txt'
        )
        const abortMultipartUploadFn = () =>
            s3Client.abortMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                multipartUpload.uploadId
            )
        const abortMultipartUploadNonExistingMultipartUploadIdFn = () =>
            s3Client.abortMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                'non-existent-upload-id'
            )

        // Assert
        expect(abortMultipartUploadFn).to.not.throw()
        expect(abortMultipartUploadNonExistingMultipartUploadIdFn).to.throw(S3ServiceError)
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