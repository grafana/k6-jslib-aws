import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import {
    SystemsManagerClient,
    SystemsManagerServiceError,
} from '../../build/ssm.min.js'

export function ssmTestSuite(data) {
    const systemsManagerClient = new SystemsManagerClient(data.awsConfig)

    describe('get parameter', () => {
        // Act
        const parameter = systemsManagerClient.getParameter(data.systemsManager.testParameter.name)
        const nonExistingParameterFn = () =>
            systemsManagerClient.getParameter('non-existing-parameter')

        // Assert
        expect(parameter).to.be.an('object')
        expect(parameter.value).to.be.an('string')
        expect(parameter.value).to.equal(data.systemsManager.testParameter.value)
        expect(nonExistingParameterFn).to.throw(SystemsManagerServiceError)
    })

    describe('get secret parameter', () => {
        // Act
        const parameter = systemsManagerClient.getParameter(data.systemsManager.testParameterSecret.name, true)
        const nonExistingParameterFn = () =>
            systemsManagerClient.getParameter('non-existing-parameter', true)

        // Assert
        expect(parameter).to.be.an('object')
        expect(parameter.value).to.be.an('string')
        expect(parameter.value).to.equal(data.systemsManager.testParameterSecret.value)
        expect(nonExistingParameterFn).to.throw(SystemsManagerServiceError)
    })
}
