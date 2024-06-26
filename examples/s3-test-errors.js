import { AWSConfig, S3Client } from '../dist/s3.js'

const awsConfig = new AWSConfig({
    region: __ENV.AWS_REGION,
    accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: __ENV.AWS_SESSION_TOKEN,
})

export default async function () {
    const s3 = new S3Client(awsConfig)

    const bucket = 'test-js-'
    const objects = await s3.listObjects(bucket)
    console.log(objects)
}