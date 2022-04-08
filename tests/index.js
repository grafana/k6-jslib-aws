import { chai } from 'https://jslib.k6.io/k6chaijs/4.3.4.0/index.js'

import { signatureTestSuite } from './internal/signature.js'

chai.config.aggregateChecks = false
chai.config.logFailures = true

export default function testSuite() {
    signatureTestSuite()
}
