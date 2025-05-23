import { AWSConfig, KinesisClient } from "../dist/kinesis.js";
import encoding from "k6/encoding";
import { fail } from "k6";

const dummyStream = `kinesis-test-stream-provisioned`;

const awsConfig = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  sessionToken: __ENV.AWS_SESSION_TOKEN,
});

const kinesis = new KinesisClient(awsConfig);

export default async function () {
  // List the streamds the AWS authentication configuration
  // gives us access to.
  const streams = await kinesis.listStreams();

  if (streams.StreamNames.filter((s) => s === dummyStream).length == 0) {
    fail(`Stream ${dummyStream} does not exist`);
  }

  // Create our test stream
  await kinesis.createStream(dummyStream, {
    ShardCount: 10,
    StreamModeDetails: {
      StreamMode: "PROVISIONED",
    },
  });

  // Put some records in it
  await kinesis.putRecords({
    StreamName: dummyStream,
    Records: [
      {
        Data: encoding.b64encode(JSON.stringify({ this: "is", a: "test" })),
        PartitionKey: "partitionKey1",
      },
      {
        Data: encoding.b64encode(
          JSON.stringify([{ this: "is", second: "test" }]),
        ),
        PartitionKey: "partitionKey2",
      },
    ],
  });

  // List the streams' shards
  const shards = await kinesis.listShards(dummyStream).Shards.map((shard) =>
    shard.ShardId
  );

  // For each shard, read all the data
  shards.map(async (shard) => {
    let iterator = await kinesis.getShardIterator(
      dummyStream,
      shard.id,
      `TRIM_HORIZON`,
    );

    let shouldBreak = false;
    while (!shouldBreak) {
      const res = await kinesis.getRecords({ ShardIterator: iterator });
      iterator = res.NextShardIterator;

      if (!res.MillisBehindLatest || res.MillisBehindLatest == `0`) {
        shouldBreak = true;
      }
    }
  });

  // Delete the stream
  await kinesis.deleteStream({ StreamName: dummyStream });
}
