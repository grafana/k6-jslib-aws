import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'
import { AWSConfig, KMSClient, KMSServiceError } from '../../build/kms.min.js'

export function kmsTestSuite(data) {
    const kmsClient = new KMSClient(data.awsConfig)

    describe('[kms] list keys', () => {
        // Act
        const keys = kmsClient.listKeys()

        // Assert
        expect(keys).to.be.an('array')
        expect(keys).to.have.lengthOf(1)
        expect(keys[0]).to.be.an('object')
        expect(keys[0].keyId).to.not.equal('')
        expect(keys[0].keyArn).to.not.equal('')
    })

    describe('[kms] generate data key', () => {
        // Arrange
        const keys = kmsClient.listKeys()
        const keyId = keys[0].keyId

        // Act
        const dataKey = kmsClient.generateDataKey(keyId, 32)

        // Assert
        expect(dataKey).to.be.an('object')
        expect(dataKey.id).to.not.equal('')
        expect(dataKey.ciphertextBlobText).to.not.equal('')
        expect(dataKey.plaintext).to.not.equal('')
    })
}
