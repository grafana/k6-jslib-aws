import { asyncDescribe } from "./helpers.js";
import {
  SystemsManagerClient,
  SystemsManagerServiceError,
} from "../../dist/ssm.js";

export async function ssmTestSuite(data) {
  const systemsManagerClient = new SystemsManagerClient(data.awsConfig);

  await asyncDescribe("sms.getParameter", async (expect) => {
    // Act
    const parameterObject = await systemsManagerClient.getParameter(
      data.systemsManager.testParameter.name,
    );

    let nonExistingParameterError;
    try {
      await systemsManagerClient.getParameter("non-existing-parameter");
    } catch (error) {
      nonExistingParameterError = error;
    }

    // Assert
    expect(parameterObject).to.be.an("object");
    expect(parameterObject.value).to.be.an("string");
    expect(parameterObject.value).to.equal(
      data.systemsManager.testParameter.value,
    );
    expect(nonExistingParameterError).to.not.be.undefined;
    expect(nonExistingParameterError).to.be.an.instanceOf(
      SystemsManagerServiceError,
    );
  });

  await asyncDescribe("sms.getSecretParameter", async (expect) => {
    // Act
    const { value: parameterValue } = await systemsManagerClient.getParameter(
      data.systemsManager.testParameterSecret.name,
      true,
    );

    let nonExistingParameterError;
    try {
      await systemsManagerClient.getParameter("non-existing-parameter", true);
    } catch (error) {
      nonExistingParameterError = error;
    }

    // Assert
    expect(parameterValue).to.be.an("string");
    expect(parameterValue).to.equal(
      data.systemsManager.testParameterSecret.value,
    );
    expect(nonExistingParameterError).to.not.be.undefined;
    expect(nonExistingParameterError).to.be.an.instanceOf(
      SystemsManagerServiceError,
    );
  });
}
