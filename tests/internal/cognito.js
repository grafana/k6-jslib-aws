import {
  __testOnlyCognitoSrp,
  CognitoIdentityProviderClient,
} from "../../dist/cognito.js";
import { asyncDescribe } from "./helpers.js";

export async function cognitoTestSuite(data) {
  const client = new CognitoIdentityProviderClient(data.awsConfig);

  const pools = await client.listUserPools();
  const pool = pools.find((candidate) =>
    candidate.Name === data.cognito.poolName
  );
  const appClients = await client.listUserPoolClients(pool.Id);
  const appClient = appClients.find((candidate) =>
    candidate.ClientName === data.cognito.clientName
  );

  await asyncDescribe("cognito.listUserPools", (expect) => {
    expect(pool).to.not.be.undefined;
  });

  await asyncDescribe("cognito.listUserPoolClients", (expect) => {
    expect(appClient).to.not.be.undefined;
  });

  await asyncDescribe("cognito.authenticateUser", async (expect) => {
    const result = await client.authenticateUser(
      data.cognito.username,
      data.cognito.password,
      pool.Id,
      appClient.ClientId,
    );

    expect(result.AccessToken).to.be.a("string").and.not.empty;
    expect(result.IdToken).to.be.a("string").and.not.empty;
    expect(result.RefreshToken).to.be.a("string").and.not.empty;
  });

  await asyncDescribe("cognito SRP extension compatibility", async (expect) => {
    const result = await __testOnlyCognitoSrp(
      "test",
      "eu-west-1_myPool",
      "499602d2",
      {
        USERNAME: "test",
        USER_ID_FOR_SRP: "test",
        SALT: "499602d2",
        SRP_B: "499602d2",
        SECRET_BLOCK: "c2VjcmV0c3NlY3Jlc3Rzc2VjcmV0cw==",
      },
      "test",
      new Date(Date.UTC(2018, 6, 10, 11, 1, 0)),
    );

    // Values from github.com/alexrudd/cognito-srp/v4, used by xk6-cognito-srp.
    expect(result.publicAHex).to.equal(
      "58b1e37b7ea681503acceae288bc1b7ca0b11360ac995547a135725fcafb7f29ac4e0c43a69854239e3e0dccf6c18664709579e8359cc24a789e16fe7cf0e268bb5076d5e6dd29d2b04a7a0e8c6007c85ddbbcd03d7ec04cba135795d83944930dc82a064b032799ce4e2af67e638e8de5c3f84fb350c060f28584b9d94204409d1e4738df9eff1482675079362a682958f4e1e4409796656b574183dc9611ce43cbf534cd5741843a3c26ff28ee648ec096b3609f3ac527c09a08d150a276a068fd8ff8edeaad7baeae21af1882df30ede88d851c89ecd0d5d5acfa80ebc96653bf227a33deb94c7d7930699e6750d4298f1bdb2bc26821e7809688162f383b4fc58a5d5ec45297ea6aa068aaf3bc550b4e55a4ce42a1c9c54e121b528fcd247f388d9fd6181a82a0614a3b2f5100e8ded5111fb5f6dfab4b8bbf9e92a59a1f972cf3e8b1aa5c285a972c79f6ec4c05f809c39eddfd54b0654a301f7a702ea3b49f11d9ff9462ec02f18e08ddce25975d824edbb5edbc72d50416bf43f82e7f",
    );
    expect(result.challengeResponses.TIMESTAMP).to.equal(
      "Tue Jul 10 11:01:00 UTC 2018",
    );
    expect(result.challengeResponses.PASSWORD_CLAIM_SIGNATURE).to.equal(
      "tdvQu/Li/qWl8Nni0aFPs+MwY4rvKZm0kSMrGIMSUHk=",
    );
  });
}
