import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.1/index.js'
import {
    SystemsManagerClient,
    SystemsManagerServiceError,
} from '../../build/ssm.min.js'

export function ssmTestSuite(data) {
    const systemsManagerClient = new SystemsManagerClient(data.awsConfig)

    describe('get parameter', () => {
        // Act
        // getParameter returns an parameter object: e.g. {parameter: {name: string, value: string...}}
        const parameterObject = systemsManagerClient.getParameter(data.systemsManager.testParameter.name)
        const nonExistingParameterFn = () =>
            systemsManagerClient.getParameter('non-existing-parameter')

        // Assert
        expect(parameterObject).to.be.an('object')
        expect(parameterObject.parameter.value).to.be.an('string')
        expect(parameterObject.parameter.value).to.equal(data.systemsManager.testParameter.value)
        expect(nonExistingParameterFn).to.throw(SystemsManagerServiceError)
    })

    describe('get secret parameter', () => {
        // Act
        // destructure the object to get the values you want directly
        const { parameter: { value: parameterValue } } = systemsManagerClient.getParameter(data.systemsManager.testParameterSecret.name, true)
        const nonExistingParameterFn = () =>
            systemsManagerClient.getParameter('non-existing-parameter', true)

        // Assert
        expect(parameterValue).to.be.an('string')
        expect(parameterValue).to.equal(data.systemsManager.testParameterSecret.value)
        expect(nonExistingParameterFn).to.throw(SystemsManagerServiceError)
    })
}
