import { asyncDescribe } from './helpers.js'
import { LambdaServiceError, LambdaClient } from '../../build/lambda.js'

const functionName = 'test-jslib-aws-lambda';

export async function lambdaTestSuite(data) {
    const lambda = new LambdaClient(data.awsConfig)

    await asyncDescribe('lambda.invoke - RequestResponse', async (expect) => {
        let lambdaError

        try {
            const result = await lambda.invoke({
                FunctionName: functionName,
                InvocationType: 'RequestResponse',
            })

            expect(result).to.be.string('Hello World!')
        } catch (error) {
            lambdaError = error
        }

        expect(lambdaError).to.be.undefined
    })

    await asyncDescribe('lambda.invoke - Event', async (expect) => {
        let lambdaError

        try {
            const result = await lambda.invoke({
                FunctionName: functionName,
                InvocationType: 'Event',
                Payload: { foo: 'bar' },
            })

            expect(result).to.be.undefined
        } catch (error) {
            lambdaError = error
        }

        expect(lambdaError).to.be.undefined
    })
}
