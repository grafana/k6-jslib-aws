import { asyncDescribe } from "./helpers.js";
import { LambdaClient } from "../../dist/lambda.js";

export async function lambdaTestSuite(data) {
  const lambdaClient = new LambdaClient(data.awsConfig);

  await asyncDescribe("lambda.invoke - RequestResponse", async (expect) => {
    // Act
    const result = await lambdaClient.invoke(
      "test-product",
      JSON.stringify({
        a: 2,
        b: 3,
      }),
    );

    // Assert
    expect(result.payload).to.equal("6");
  });

  await asyncDescribe("lambda.invoke - Event", async (expect) => {
    // Act
    const result = await lambdaClient.invoke(
      "test-product",
      JSON.stringify({
        a: 2,
        b: 3,
      }),
      {
        invocationType: "Event",
      },
    );

    // Assert
    expect(result.statusCode).to.equal(202);
  });

  await asyncDescribe("lambda.invokeFail", async (expect) => {
    let expectedError;
    try {
      await lambdaClient.invoke("test-fail", "my-failure");
    } catch (error) {
      expectedError = error;
    }

    expect(expectedError).to.be.an("error");
  });

  await asyncDescribe("lambda.invoke - Log", async (expect) => {
    // Act
    const result = await lambdaClient.invoke(
      "test-product",
      JSON.stringify({
        a: 5,
        b: 6,
      }),
      {
        logType: "Tail",
      },
    );

    // Assert
    expect(result.payload).to.equal("30");
    expect(result.logResult).to.contain('received event: {"a":5,"b":6}');
  });
}
