import { asyncDescribe } from "./helpers.js";
import { EventBridgeClient } from "../../dist/event-bridge.js";

export async function eventBridgeTestSuite(data) {
  const eventBridge = new EventBridgeClient(data.awsConfig);

  await asyncDescribe("eventBridge.putEvents", async (expect) => {
    let putEventsError;

    try {
      await eventBridge.putEvents({
        Entries: [
          {
            Detail: {
              id: "id",
              type: "VIEW",
              show: 5,
              timestamp: "1690858574000",
            },
            DetailType: "Video View",
            Resources: ["goo"],
            Source: "nice",
          },
        ],
      });
    } catch (error) {
      putEventsError = error;
    }

    expect(putEventsError).to.be.undefined;
  });
}
