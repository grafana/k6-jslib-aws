import { AWSConfig, EventBridgeClient } from "../dist/event-bridge.js";

const awsConfig = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  sessionToken: __ENV.AWS_SESSION_TOKEN,
});

const eventBridge = new EventBridgeClient(awsConfig);

export default async function () {
  const eventDetails = {
    Source: "my.custom.source",
    Detail: { key1: "value1", key2: "value2" },
    DetailType: "MyDetailType",
    Resources: ["arn:aws:resource1"],
  };

  const input = {
    Entries: [eventDetails],
  };

  try {
    await eventBridge.putEvents(input);
  } catch (error) {
    console.error(`Failed to put events: ${error.message}`);
  }
}
