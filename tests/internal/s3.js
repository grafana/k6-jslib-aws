import { asyncDescribe } from './helpers.js'

import { AWSConfig, S3Client, S3ServiceError } from '../../build/s3.js'

export async function s3TestSuite(data) {
    const s3Client = new S3Client(data.awsConfig)
    s3Client.host = `s3.${data.awsConfig.endpoint}`
    s3Client.scheme = `https`

    await asyncDescribe('s3.listBuckets', async (expect) => {
        // Act
        const buckets = await s3Client.listBuckets()

        // Assert
        expect(buckets).to.be.an('array')
        expect(buckets).to.have.lengthOf(1)
        expect(buckets[0].name).to.equal(data.s3.testBucketName)
    })

    await asyncDescribe('s3.listObjects', async (expect) => {
        // Act
        const objects = await s3Client.listObjects(data.s3.testBucketName)

        // Assert
        expect(objects).to.be.an('array')
        expect(objects).to.have.lengthOf(3)
        expect(objects[0].key).to.equal('bonjour.txt')
        expect(objects[1].key).to.equal('delete.txt')
        expect(objects[2].key).to.equal('tschuss.txt')
    })

    await asyncDescribe('s3.getObject', async (expect) => {
        // Act
        const gotFirstObject = await s3Client.getObject(
            data.s3.testBucketName,
            data.s3.testObjects[0].key
        )

        const gotSecondObject = await s3Client.getObject(
            data.s3.testBucketName,
            data.s3.testObjects[1].key
        )

        let getObjectFromNonExistingBucketError
        try {
            await s3Client.getObject('non-existent-bucket', data.s3.testObjects[0].key)
        } catch (error) {
            getObjectFromNonExistingBucketError = error
        }

        let getNonExistingObjectError
        try {
            await s3Client.getObject(data.s3.testBucketName, 'non-existent-object.txt')
        } catch (error) {
            getNonExistingObjectError = error
        }

        // Assert
        expect(gotFirstObject).to.be.an('object')
        expect(gotFirstObject.key).to.equal(data.s3.testObjects[0].key)
        expect(gotFirstObject.data).to.equal(data.s3.testObjects[0].body)
        expect(gotSecondObject).to.be.an('object')
        expect(gotSecondObject.key).to.equal(data.s3.testObjects[1].key)
        expect(gotSecondObject.data).to.equal(data.s3.testObjects[1].body)
        expect(getObjectFromNonExistingBucketError).to.not.be.undefined
        expect(getObjectFromNonExistingBucketError).to.be.an.instanceOf(S3ServiceError)
        expect(getNonExistingObjectError).to.not.be.undefined
        expect(getNonExistingObjectError).to.be.an.instanceOf(S3ServiceError)
    })

    asyncDescribe('s3.putObject', async (expect) => {
        // Act
        let putObectError
        try {
            await s3Client.putObject(
                data.s3.testBucketName,
                'created-by-test.txt',
                'This file was created by a test'
            )
        } catch (error) {
            putObectError = error
        }

        // Assert
        expect(putObectError).to.be.undefined
    })

    asyncDescribe('s3.deleteObject', async (expect) => {
        // Act
        let deleteExistingObjectError
        try {
            await s3Client.deleteObject(data.s3.testBucketName, data.s3.testObjects[2].key)
        } catch (error) {
            deleteExistingObjectError = error
        }

        let deleteFromNonExistingBucketError
        try {
            await s3Client.deleteObject('non-existent-bucket', data.s3.testObjects[2].key)
        } catch (error) {
            deleteFromNonExistingBucketError = error
        }

        let deleteNonExistingObjectError
        try {
            await s3Client.deleteObject(data.s3.testBucketName, 'non-existent-object.txt')
        } catch (error) {
            deleteNonExistingObjectError = error
        }

        // Assert
        expect(deleteExistingObjectError).to.be.undefined
        expect(deleteFromNonExistingBucketError).to.not.be.undefined
        // expect(deleteNonExistingObjectError).to.not.be.undefined
    })

    asyncDescribe('s3.copyObject', async (expect) => {
        // Arrange
        const sourceObject = data.s3.testObjects[0]
        const sourceKey = sourceObject.key
        const destinationKey = sourceKey + '-new'
        const bucket = data.s3.testBucketName

        // Act
        await s3Client.copyObject(bucket, sourceKey, bucket, destinationKey)
        const newObject = await s3Client.getObject(bucket, destinationKey)

        // Assert
        expect(newObject).to.be.an('object')
        expect(newObject.key).to.equal(destinationKey)
        expect(newObject.data).to.equal(sourceObject.body)
    })

    asyncDescribe('s3.createMultipartUpload', async (expect) => {
        // Arrange
        let createMultipartUploadError
        try {
            await s3Client.createMultipartUpload(data.s3.testBucketName, 'created-by-test.txt')
        } catch (error) {
            createMultipartUploadError = error
        }

        // Assert
        expect(createMultipartUploadError).to.be.undefined
    })

    asyncDescribe('s3.uploadPart', async (expect) => {
        // Arrange
        const multipartUpload = await s3Client.createMultipartUpload(
            data.s3.testBucketName,
            'created-by-test.txt'
        )

        // Act
        let uploadPartError
        try {
            await s3Client.uploadPart(
                data.s3.testBucketName,
                multipartUpload.key,
                multipartUpload.uploadId,
                1,
                'This file was created by a test'
            )
        } catch (error) {
            uploadPartError = error
        }

        let uploadPartNonExistingMultipartUploadIdError
        try {
            await s3Client.uploadPart(
                data.s3.testBucketName,
                multipartUpload.key,
                'non-existent-upload-id',
                1,
                'This file was created by a test'
            )
        } catch (error) {
            uploadPartNonExistingMultipartUploadIdError = error
        }

        // Assert
        expect(uploadPartError).to.be.undefined
        expect(uploadPartNonExistingMultipartUploadIdError).to.not.be.undefined
        expect(uploadPartNonExistingMultipartUploadIdError).to.be.an.instanceOf(S3ServiceError)
    })

    await asyncDescribe('s3.completeMultipartUpload', async (expect) => {
        // Arrange
        const multipartUpload = await s3Client.createMultipartUpload(
            data.s3.testBucketName,
            'created-by-test.txt'
        )
        const uploadPart = await s3Client.uploadPart(
            data.s3.testBucketName,
            multipartUpload.key,
            multipartUpload.uploadId,
            1,
            'This file was created by a test'
        )

        let completeMultipartUploadError
        try {
            await s3Client.completeMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                multipartUpload.uploadId,
                [uploadPart]
            )
        } catch (error) {
            completeMultipartUploadError = error
        }

        let completeMultipartUploadNonExistingMultipartUploadIdError
        try {
            await s3Client.completeMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                'non-existent-upload-id',
                [uploadPart]
            )
        } catch (error) {
            completeMultipartUploadNonExistingMultipartUploadIdError = error
        }

        let completeMultipartUploadNonExistingPartError
        try {
            await s3Client.completeMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                multipartUpload.uploadId,
                [{ partNumber: 2, etag: 'non-existent-etag' }]
            )
        } catch (error) {
            completeMultipartUploadNonExistingPartError = error
        }

        // Assert
        expect(completeMultipartUploadError).to.be.undefined
        expect(completeMultipartUploadNonExistingMultipartUploadIdError).to.be.an.instanceOf(
            S3ServiceError
        )
        expect(completeMultipartUploadNonExistingPartError).to.be.an.instanceOf(S3ServiceError)
    })

    await asyncDescribe('s3.abortMultipartUpload', async (expect) => {
        // Arrange
        const multipartUpload = await s3Client.createMultipartUpload(
            data.s3.testBucketName,
            'created-by-test.txt'
        )

        let abortMultipartUploadError
        try {
            await s3Client.abortMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                multipartUpload.uploadId
            )
        } catch (error) {
            abortMultipartUploadError = error
        }

        let abortMultipartUploadNonExistingMultipartUploadIdError
        try {
            await s3Client.abortMultipartUpload(
                data.s3.testBucketName,
                multipartUpload.key,
                'non-existent-upload-id'
            )
        } catch (error) {
            abortMultipartUploadNonExistingMultipartUploadIdError = error
        }

        // Assert
        expect(abortMultipartUploadError).to.be.undefined
        expect(abortMultipartUploadNonExistingMultipartUploadIdError).to.be.an.instanceOf(
            S3ServiceError
        )
    })

    // Teardown
    // Ensure to cleanup the file create by the s3 tests.
    await s3Client.deleteObject(data.s3.testBucketName, 'created-by-test.txt')

    // Ensure the object used to test deletion is recreated
    await s3Client.putObject(
        data.s3.testBucketName,
        data.s3.testObjects[2].key,
        data.s3.testObjects[2].body
    )
}
