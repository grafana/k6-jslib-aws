import exec from 'k6/execution'

import { AWSConfig, KinesisClient } from '../../build/kinesis.js'
import encoding from 'k6/encoding'
import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.2/index.js'
import { fail, sleep } from 'k6'

const dummyStream = `kinesis-test-stream-dummy`

export function kinesisTestSuite(data) {
    const kinesis = new KinesisClient(data.awsConfig)

    describe('[kinesis] create a stream', () => {
        try {
            // Valid Values: PROVISIONED | ON_DEMAND
            kinesis.createStream(dummyStream, {
                ShardCount: 10,
                StreamModeDetails: {
                    StreamMode: 'PROVISIONED',
                },
            })
        } catch (err) {
            fail(err)
        }
    })

    describe('[kinesis] list streams', () => {
        try {
            const res = kinesis.listStreams()
            expect(res.StreamNames.length, 'number of streams').to.equal(1)
        } catch (err) {
            fail(err)
        }
    })

    describe('[kinesis] kist streams with arguments', () => {
        try {
            const res = kinesis.listStreams({ limit: 1 })
            expect(res.StreamNames.length, 'number of streams').to.equal(1)
        } catch (err) {
            fail(err)
        }
        sleep(2)
    })

    describe('[kinesis] publish to a stream', () => {
        try {
            for (let i = 0; i < 50; i++) {
                const records = [
                    {
                        Data: encoding.b64encode(JSON.stringify({ this: 'is', a: 'test' })),
                        PartitionKey: 'partitionKey1',
                    },
                    {
                        Data: encoding.b64encode(JSON.stringify([{ this: 'is', second: 'test' }])),
                        PartitionKey: 'partitionKey2',
                    },
                ]

                const res = kinesis.putRecords(records, { streamName: dummyStream })
                expect(res.FailedRecordCount, `Failed Records to publish`).to.equal(0)
                expect(res.Records.length, `Total Records`).to.equal(2)
            }
        } catch (err) {
            fail(err)
        }
    })

    describe('[kinesis] Gets read all data from shards', () => {
        try {
            kinesis.listShards(dummyStream).Shards.map((shard) => {
                let iterator = kinesis.getShardIterator(
                    dummyStream,
                    shard.Id,
                    `TRIM_HORIZON`
                ).ShardIterator

                while (true) {
                    const res = kinesis.getRecords(iterator)
                    iterator = res.NextShardIterator

                    if (!res.MillisBehindLatest || res.MillisBehindLatest == `0`) {
                        break
                    }
                }
            })
        } catch (err) {
            fail(err)
        }
    })

    describe('[kinesis] delete a stream', () => {
        try {
            kinesis.deleteStream(dummyStream)
        } catch (err) {
            fail(err)
        }
    })
}
