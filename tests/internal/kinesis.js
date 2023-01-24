import exec from 'k6/execution'

import { AWSConfig, KinesisClient } from '../../build/kinesis.js'
import encoding from 'k6/encoding';
import { describe, expect } from 'https://jslib.k6.io/k6chaijs/4.3.4.2/index.js';
import { fail, sleep } from 'k6';


const dummyStream = `kinesis-test-stream-provisioned`



export function kinesisTestSuite(data) {
    const kinesis = new KinesisClient(data.awsConfig)

    const getShardIds = () => {    
        const res = kinesis.ListShards({
            StreamName: dummyStream, 
        })
        const shardIds = res.json(`Shards`).map(shard => shard.ShardId);
        return shardIds
    }
    
    const getShardIterator = (shardId) => {
        const res = kinesis.GetShardIterator({
            StreamName: dummyStream, 
            ShardId: shardId,
            ShardIteratorType: `TRIM_HORIZON`
        })
        return res.json(`ShardIterator`)
    }
    
    describe('01. Create kinesis Stream', () => {
        try {
            // Valid Values: PROVISIONED | ON_DEMAND
            const res = kinesis.CreateStream({
                
                    "ShardCount": 10,
                    "StreamModeDetails": { 
                       "StreamMode": "PROVISIONED"
                    },
                    "StreamName": dummyStream
                 
            })
            expect(res.json(), `generate empty response - on creation`).to.be.empty;
        } catch(err) {
            fail(err)
        }
    })

    describe('02. List Kinesis streams', () => {
        try {
            const res = kinesis.ListStreams()
            expect(res.json('StreamNames').length,"number of streams").to.equal(1);
        } catch(err) {
            fail(err)
        }
        
    })


    describe('03. List kinesis stream with arguments', () => {
        try {
            const res = kinesis.ListStreams({Limit: 1})
            expect(res.json('StreamNames').length,"number of streams").to.equal(1);
        } catch(err) {
            fail(err)
        }
        sleep(2)
    })


    describe('04. publish to kinesis Stream', () => {
        try {
            for (let i=0; i<50; i++ ) {
                    const res = kinesis.PutRecords({ 
                    StreamName: dummyStream,
                    Records: [ 
                        {
                        Data: encoding.b64encode(JSON.stringify([{'this': 'is', 'a': 'test'}, {'this': 'is', 'second': 'test'}])),
                        PartitionKey: "partitionKey1"
                        }
                    ]
                })
                console.log(res.json())
                expect(res.json(`FailedRecordCount`, `Failed Records to publish`)).to.equal(0);
                expect(res.json(`Records`).length, `Total Records`).to.equal(1);
            }
        } catch(err) {
            fail(err)
        }
    })



    describe('05. Gets an Amazon Kinesis read all data ', () => {
       try {
           const shards = getShardIds()
           shards.map(shard => {
                let iterator = getShardIterator(shard)
                while(true) {
                    const res = kinesis.GetRecords({ShardIterator: iterator})
                    console.log(shard, res.json(`Records`), res.json(`MillisBehindLatest`))
                    iterator = res.json(`NextShardIterator`)
                    if(res.json(`MillisBehindLatest`) == `0`) {
                        break
                    }
                }
           })
        } catch(err) {
            fail(err)
        }
    })


    describe('06. Delete kinesis Stream', () => {
        try {
            const res = kinesis.DeleteStream({StreamName: dummyStream})
            expect(res.json(), `generate empty response - on deletion`).to.be.empty;
        } catch(err) {
            fail(err)
        }
    })
}
