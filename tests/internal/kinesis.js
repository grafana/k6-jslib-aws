import { asyncDescribe } from "./helpers.js";
import { KinesisClient } from "../../dist/kinesis.js";
import encoding from "k6/encoding";
import { sleep } from "k6";

const dummyStream = `kinesis-test-stream-dummy`;

export async function kinesisTestSuite(data) {
  const kinesis = new KinesisClient(data.awsConfig);

  await asyncDescribe("kinesis.createStream", async (expect) => {
    // Valid Values: PROVISIONED | ON_DEMAND
    let createStreamError;

    try {
      await kinesis.createStream(dummyStream, {
        shardCount: 10,
        streamModeDetails: {
          streamMode: "PROVISIONED",
        },
      });
    } catch (error) {
      createStreamError = error;
    }

    expect(createStreamError).to.be.undefined;
  });

  await asyncDescribe("kinesis.listStreams", async (expect) => {
    const res = await kinesis.listStreams();

    expect(res.streamNames.length, "number of streams").to.equal(1);
  });

  await asyncDescribe("kinesis.listStreams with arguments", async (expect) => {
    const res = await kinesis.listStreams({ limit: 1 });

    expect(res.streamNames.length, "number of streams").to.equal(1);
    sleep(2);
  });

  await asyncDescribe("kinesis.putRecords", async (expect) => {
    for (let i = 0; i < 50; i++) {
      const records = [
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
      ];

      const res = await kinesis.putRecords(records, {
        streamName: dummyStream,
      });
      expect(res.failedRecordCount, `Failed Records to publish`).to.equal(0);
      expect(res.records.length, `Total Records`).to.equal(2);
    }
  });

  await asyncDescribe(
    "kinesis.listShards and read all data from shards",
    async () => {
      const shards = await kinesis.listShards(dummyStream);
      for (const shard of shards.shards) {
        let iterator = (await kinesis.getShardIterator(
          dummyStream,
          shard.id,
          `TRIM_HORIZON`,
        ))
          .shardIterator;

        let shouldBreak = false;
        while (!shouldBreak) { // Use the variable in the condition
          const res = await kinesis.getRecords(iterator);
          iterator = res.nextShardIterator;

          if (!res.millisBehindLatest || res.millisBehindLatest == `0`) {
            shouldBreak = true; // Set the variable to true to break the loop
          }
        }
      }
    },
  );

  await asyncDescribe("kinesis.deleteStream", async () => {
    await kinesis.deleteStream(dummyStream);
  });
}
