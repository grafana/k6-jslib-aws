# Migrating from xk6-cognito-srp

This guide replaces the custom [`xk6-cognito-srp`](https://github.com/OS-jyothikaspa/xk6-cognito-srp)
extension with the Cognito client in `k6-jslib-aws`. The JavaScript library
does not require a custom k6 binary.

## Current extension code

Remove the extension import and its `connect()`/`auth()` calls:

```javascript
import cognito from "k6/x/cognito-srp";

const client = cognito.connect(__ENV.AWS_REGION);

export default function () {
  const tokens = client.auth(
    __ENV.COGNITO_USERNAME,
    __ENV.COGNITO_PASSWORD,
    __ENV.COGNITO_USER_POOL_ID,
    __ENV.COGNITO_CLIENT_ID,
    {},
  );

  // tokens.AccessToken, tokens.IdToken, tokens.RefreshToken
}
```

## Temporary PR import

Before the Cognito client is released, import the source pinned to the PR
commit. Use `raw.githubusercontent.com`; GitHub's `blob` URLs serve HTML and
cannot be imported as k6 modules.

```javascript
import {
  CognitoIdentityProviderClient,
} from "https://raw.githubusercontent.com/grafana/k6-jslib-aws/2dd37002a26bbc7dd1fae2f7e7d1b70b270eb87b/src/cognito.ts";
import {
  AWSConfig,
} from "https://raw.githubusercontent.com/grafana/k6-jslib-aws/2dd37002a26bbc7dd1fae2f7e7d1b70b270eb87b/src/internal/config.ts";

const config = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
});

const cognito = new CognitoIdentityProviderClient(config);

export default async function () {
  const tokens = await cognito.authenticateUser(
    __ENV.COGNITO_USERNAME,
    __ENV.COGNITO_PASSWORD,
    __ENV.COGNITO_USER_POOL_ID,
    __ENV.COGNITO_CLIENT_ID,
  );

  // tokens.AccessToken, tokens.IdToken, tokens.RefreshToken
}
```

The temporary URL is pinned to one commit. It is appropriate for evaluation,
not as a long-term dependency.

## App-client secrets and SMS MFA

Pass an options object as the fifth argument when the Cognito app client has a
secret or the user must answer an SMS MFA challenge:

```javascript
const tokens = await cognito.authenticateUser(
  __ENV.COGNITO_USERNAME,
  __ENV.COGNITO_PASSWORD,
  __ENV.COGNITO_USER_POOL_ID,
  __ENV.COGNITO_CLIENT_ID,
  {
    clientSecret: __ENV.COGNITO_CLIENT_SECRET,
    mfaCode: __ENV.COGNITO_MFA_CODE,
  },
);
```

Omit either property when it does not apply.

## Released-library import

After release, replace the temporary raw GitHub imports with the versioned
jslib URL:

```javascript
import {
  AWSConfig,
} from "https://jslib.k6.io/aws/<released-version>/cognito.js";
```

Replace `<released-version>` with the version that contains the Cognito
client.
