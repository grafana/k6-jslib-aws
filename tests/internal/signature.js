import { hmac } from 'k6/crypto'
import { describe, expect, chai } from 'https://jslib.k6.io/k6chaijs/4.3.4.0/index.js'

import { AWSConfig, URIEncodingConfig } from '../../build/aws.min.js'

import {
    signHeaders,
    calculateSignature,
    deriveSigningKey,
    HashingAlgorithm,
    createStringToSign,
    createCredentialScope,
    createCanonicalRequest,
    createCanonicalHeaders,
    createCanonicalURI,
    createCanonicalQueryString,
    createSignedHeaders,
    UnsignedPayload,
    createCanonicalPayload,
    URIEncode,
    parseQueryString,
    toTime,
    toDate,
} from '../../build/_signature.min.js'

export function signatureTestSuite() {
    describe('signing headers set the Authorization header', () => {
        // Arrange
        const headers = { Host: 'dynamodb.us-east-1.amazonaws.com;' }
        const requestTimestamp = new Date('1212-12-12').getTime()
        const method = 'POST'
        const path = '/'
        const querystring = ''
        const body = ''
        const awsConfig = new AWSConfig({
            accessKeyId: 'MCLUKL4AX3ITESWH2RAB', // fake value, pre-generated for the purpose of the test
            secretAccessKey: 'bba74e802bcf6c0fb52ba3b60e9e3c5a076ec3b268599255ddad2c1fc0da5771', // fake value, pre-generated for the purpose of the test
            region: 'us-east-1',
        })
        const serviceName = 'dynamodb'
        const URIencodingConfig = new URIEncodingConfig(false, true)

        // Act
        const signedHeaders = signHeaders(
            headers,
            requestTimestamp,
            method,
            path,
            querystring,
            body,
            awsConfig,
            'dynamodb',
            URIencodingConfig
        )

        expect(signedHeaders).to.have.property('Authorization')
        expect(signedHeaders.Authorization).to.be.a('string')
        expect(signedHeaders.Authorization).to.equal(
            'AWS4-HMAC-SHA256 Credential=MCLUKL4AX3ITESWH2RAB/12121212/us-east-1/dynamodb/aws4_request, SignedHeaders=host, Signature=ae97e8b9257af4c1adcd0b8e7b37e29e5069ca074a0bea8bdc84a5a3d9db93e7'
        )
    })

    describe('calculating signature', () => {
        // Arrange
        const now = new Date('1212-12-12').getTime()
        const stringToSign = `AWS4-HMAC-SHA256
        12121212T000000Z
        12121212/eu-west-1/secretsmanager/aws4_request
        7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9`

        // Act
        const gotSignature = calculateSignature(
            // hardcoded signing key
            'fd35270b7660925905deb79146bf12ce91142400e88bfa09aeacc4a6abee4ddc',
            stringToSign
        )

        // Assert
        expect(gotSignature).to.equal(
            hmac(
                'sha256',
                'fd35270b7660925905deb79146bf12ce91142400e88bfa09aeacc4a6abee4ddc',
                stringToSign,
                'hex'
            )
        )
    })

    // // We use pre-computed outputs we know to be valid
    // // in the context of the test
    // describe('deriving signing key', () => {
    //     // Arrange
    //     const now = new Date('1212-12-12').getTime()

    //     // Key
    //     const key = deriveSigningKey(
    //         '00350dcacb37aeb25d5898b1cff276269cbc052a0aef5c39be6eb5647d71ba2d',
    //         now,
    //         'eu-west-1',
    //         'secretsmanager'
    //     )

    //     // Assert
    //     expect(key).to.equal('fd35270b7660925905deb79146bf12ce91142400e88bfa09aeacc4a6abee4ddc')
    //     expect(
    //         deriveSigningKey(
    //             '3d52c239bbbad0160f65aaa8032cedd7f55b02c9c97bbf506e4a87e6c215eb7c',
    //             now,
    //             'us-east-1',
    //             's3'
    //         )
    //     ).to.equal('b77a22f047328f601e06879f332e6c71fb2d8b0b2bd7f20ac9ea07db4ae86bd9')
    //     expect(
    //         deriveSigningKey(
    //             'b356aefcd080ec0ca97f5bd8b2d3ab46177cfb62b2eb5c9ae3a6d0592551c702',
    //             now,
    //             'ap-south-1',
    //             'dynamodb'
    //         )
    //     ).to.equal('a54c8ecfa8aa61a7e8b9560912da16cd4d2beafb34e8b1eeca37dc27a25fa58b')
    // })

    describe('creating a string to sign', () => {
        // Arrange
        const now = new Date('1212-12-12').getTime()
        const credentialScope = createCredentialScope(now, 'eu-west-1', 'secretsmanager')
        const wantStringToSign = [
            HashingAlgorithm,
            toTime(now),
            credentialScope,
            '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9',
        ].join('\n')

        // Act
        const gotStringToSign = createStringToSign(
            now,
            'eu-west-1',
            'secretsmanager',
            '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9'
        )

        // Assert
        expect(gotStringToSign).to.equal(wantStringToSign)
    })

    describe('creating a credential scope', () => {
        const now = new Date('1212-12-12').getTime()
        expect(createCredentialScope(now, 'eu-west-1', 'secretsmanager', 'aws4_request')).to.equal(
            `${toDate(now)}/eu-west-1/secretsmanager/aws4_request`
        )
    })

    describe('creating a canonical request', () => {
        // it should return a string
        expect(
            createCanonicalRequest(
                'GET', // method
                '/document and settings', // URI
                'Action=ListUsers&Version=2010-05-08', // query string
                {
                    'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
                    Host: 'iam.amazonaws.com',
                    'x-amz-date': '20150830T123600Z',
                }, // headers
                'hello world!', // payload
                new URIEncodingConfig(false, true)
            )
        ).to.be.a('string')

        // it should return a string in the expected format
        expect(
            createCanonicalRequest(
                'GET', // method
                '/documents and settings', // URI
                'Action=ListUsers&Version=2010-05-08', // query string
                {
                    'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
                    Host: 'iam.amazonaws.com',
                    'x-amz-date': '20150830T123600Z',
                },
                'hello world!',
                new URIEncodingConfig(true, true) // double URI encoding
            )
        ).to.equal(
            [
                'GET',
                '/documents%2520and%2520settings',
                'Action=ListUsers&Version=2010-05-08',
                'content-type:application/x-www-form-urlencoded; charset=utf-8',
                'host:iam.amazonaws.com',
                'x-amz-date:20150830T123600Z',
                '',
                'content-type;host;x-amz-date',
                '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9',
            ].join('\n')
        )

        // it should return a string in the expected format, while
        // respecting the selected path encoding
        expect(
            createCanonicalRequest(
                'GET', // method
                '/documents and settings', // URI
                'Action=ListUsers&Version=2010-05-08', // query string
                {
                    'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
                    Host: 'iam.amazonaws.com',
                    'x-amz-date': '20150830T123600Z',
                },
                'hello world!',
                new URIEncodingConfig(true, false)
            )
        ).to.equal(
            [
                'GET',
                '%252Fdocuments%2520and%2520settings', // Note that we double encode the forward slash
                'Action=ListUsers&Version=2010-05-08',
                'content-type:application/x-www-form-urlencoded; charset=utf-8',
                'host:iam.amazonaws.com',
                'x-amz-date:20150830T123600Z',
                '',
                'content-type;host;x-amz-date',
                '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9',
            ].join('\n')
        )
    })

    describe('creating a canonical URI', () => {
        expect(createCanonicalURI('/')).to.be.a('string')
        expect(createCanonicalURI('/')).to.be.equal('/')

        expect(
            createCanonicalURI('/documents and settings', new URIEncodingConfig(true, false))
        ).to.be.a('string')

        expect(
            createCanonicalURI('/documents and settings', new URIEncodingConfig(true, true))
        ).to.equal('/documents%2520and%2520settings')

        expect(
            createCanonicalURI('/documents and settings', new URIEncodingConfig(true, false))
        ).to.equal('%252Fdocuments%2520and%2520settings')

        expect(
            createCanonicalURI('/documents and settings', new URIEncodingConfig(false, false))
        ).to.equal('%2Fdocuments%20and%20settings')

        expect(
            createCanonicalURI('/documents and settings', new URIEncodingConfig(false, true))
        ).to.equal('/documents%20and%20settings')

        expect(
            createCanonicalURI('/documents and settings/', new URIEncodingConfig(true, true))
        ).to.equal('/documents%2520and%2520settings/')

        expect(
            createCanonicalURI('/documents and settings/', new URIEncodingConfig(false, true))
        ).to.equal('/documents%20and%20settings/')
    })

    describe('creating a canonical query string', () => {
        expect(createCanonicalQueryString('')).to.be.a('string')
        expect(createCanonicalQueryString('')).to.be.equal('')

        expect(createCanonicalQueryString('Action=ListUsers&Version=2010-05-08')).to.be.a('string')

        expect(createCanonicalQueryString('Action=ListUsers')).to.equal('Action=ListUsers')

        expect(createCanonicalQueryString('Action=ListUsers&Version=2010-05-08')).to.equal(
            'Action=ListUsers&Version=2010-05-08'
        )

        // sorts the parameter names by character code point
        expect(createCanonicalQueryString('Version=2010-05-08&Action=ListUsers')).to.equal(
            'Action=ListUsers&Version=2010-05-08'
        )

        // parameters with duplicate names should be sorted by value.
        // N.B uppercase characters have a smaller value than lowercase ones.
        expect(createCanonicalQueryString('Version=2010-05-08&veritas=Serum')).to.equal(
            'veritas=Serum&Version=2010-05-08'
        )

        //unreserved characters defined by RF3986 shouldn't be URI-encoded
        expect(createCanonicalQueryString('A-b_=.0~9')).to.equal('A-b_=.0~9')

        // all other characters must be percent encoded (%XY where X and Y are hexadcimal characters
        // (0-9 and uppercase A-F)).
        expect(createCanonicalQueryString('documents and settings=U+0024')).to.equal(
            'documents%20and%20settings=U%2B0024'
        )

        // Empty value results in an empty string
        expect(createCanonicalQueryString('Action=ListUsers&Version')).to.equal(
            'Action=ListUsers&Version='
        )

        // Parameter names and values are URL encoded
        expect(createCanonicalQueryString('abc 123=easy as&do re mi')).to.equal(
            'abc%20123=easy%20as&do%20re%20mi='
        )
    })

    describe('canonical headers', () => {
        expect(createCanonicalHeaders({})).to.be.a('string')
        expect(createCanonicalHeaders({})).to.equal('')

        // All header names should be lowercased
        expect(createCanonicalHeaders({ Host: 'iam.amazonaws.com' })).to.equal(
            'host:iam.amazonaws.com\n'
        )

        // All header names should have leading and trailing spaces trimmed
        expect(createCanonicalHeaders({ '   Host ': 'iam.amazonaws.com' })).to.equal(
            'host:iam.amazonaws.com\n'
        )

        // All header values sequential spaces should be converted
        // into a single space
        expect(
            createCanonicalHeaders({
                'Content-Type': 'application/x-www-form-urlencoded;    charset=utf-8',
            })
        ).to.equal('content-type:application/x-www-form-urlencoded; charset=utf-8\n')

        // canonical headers should be sorted by (lowercased) header names
        // character codes
        expect(
            createCanonicalHeaders({
                Host: 'iam.amazonaws.com',
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                'My-header1': '    a   b   c  ',
                'X-Amz-Date': '20150830T123600Z',
                'My-Header2': '    "a   b   c"  ',
            })
        ).to.equal(
            [
                'content-type:application/x-www-form-urlencoded; charset=utf-8',
                'host:iam.amazonaws.com',
                'my-header1:a b c',
                'my-header2:"a b c"',
                'x-amz-date:20150830T123600Z',
            ].join('\n') + '\n'
        ) // there should be a trailing newline
    })

    describe('creating signed headers', () => {
        expect(() => createSignedHeaders(123)).to.throw(TypeError)
        expect(() => createSignedHeaders({})).to.throw()

        // signed headers names are lowercased
        expect(createSignedHeaders({ 'Content-Type': 'application/json' })).to.equal('content-type')

        // signed headers are semi-colon separated
        expect(
            createSignedHeaders({ 'Content-Type': 'application/json', Host: 'iam.amazonaws.com' })
        ).to.equal('content-type;host')

        // signed headers are ordered by name
        expect(
            createSignedHeaders({ Host: 'iam.amazonaws.com', 'Content-Type': 'application/json' })
        ).to.equal('content-type;host')
    })

    describe('creating a canonical signed payload', () => {
        expect(createCanonicalPayload(UnsignedPayload)).to.be.a('string')
        expect(createCanonicalPayload(UnsignedPayload)).to.be.equal(UnsignedPayload)

        expect(createCanonicalPayload('')).to.be.a('string')
        expect(createCanonicalPayload('')).to.equal(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        )

        expect(createCanonicalPayload('hello world!')).to.be.a('string')
        expect(createCanonicalPayload('hello world!')).to.equal(
            '7509e5bda0c762d2bac7f90d758b5b2263fa01ccbc542ab5e3df163be08e6ca9'
        )

        // TODO: Add a test loading an image
    })

    describe('encoding a URI', () => {
        expect(URIEncode('')).to.equal('')
        expect(URIEncode('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).to.equal('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        expect(URIEncode('abcdefghijklmnopqrstuvwxyz')).to.equal('abcdefghijklmnopqrstuvwxyz')
        expect(URIEncode('0123456789')).to.equal('0123456789')
        expect(URIEncode('-._~')).to.equal('-._~')
        expect(URIEncode(' ')).to.equal('%20')
        expect(URIEncode('/')).to.equal('%2F')
        expect(URIEncode('/', true)).to.equal('/')
        expect(URIEncode('resource')).to.equal('resource')
        expect(URIEncode('resource/123')).to.equal('resource%2F123')
        expect(URIEncode('resource/123', true)).to.equal('resource/123')
        expect(URIEncode("single quote ' is special")).to.equal(
            'single%20quote%20%27%20is%20special'
        )
    })

    describe('parsing a query string', () => {
        expect(parseQueryString('')).to.be.a('Array')
        expect(parseQueryString('')).to.eql([])

        expect(parseQueryString('Action=ListUsers&Version=2010-05-08')).to.be.a('Array')
        expect(parseQueryString('Action=ListUsers')).to.eql([['Action', 'ListUsers']])

        expect(parseQueryString('Action=ListUsers&')).to.eql([['Action', 'ListUsers']])
        expect(parseQueryString('Action=ListUsers&Version=2010-05-08')).to.eql([
            ['Action', 'ListUsers'],
            ['Version', '2010-05-08'],
        ])

        const res = parseQueryString('Action=ListUsers&Version')
        expect(parseQueryString('Action=ListUsers&Version')).to.eql([
            ['Action', 'ListUsers'],
            ['Version', ''],
        ])
    })

    describe('toTime', () => {
        const ts = new Date('1212-12-12').getTime()
        expect(toTime(ts)).to.be.a('string')
        expect(toTime(ts)).to.equal('12121212T000000Z')
    })

    describe('toDate', () => {
        const ts = new Date('1212-12-12').getTime()
        expect(toDate(ts)).to.be.a('string')
        expect(toDate(ts)).to.equal('12121212')
    })
}
