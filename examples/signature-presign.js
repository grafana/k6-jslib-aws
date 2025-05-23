import http from "k6/http";
import { check } from "k6";

import {
  AMZ_CONTENT_SHA256_HEADER,
  AWSConfig,
  Endpoint,
  SignatureV4,
} from "../dist/index.js";

const awsConfig = new AWSConfig({
  region: __ENV.AWS_REGION,
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  sessionToken: __ENV.AWS_SESSION_TOKEN,
});

export default function () {
  // In order to be able to produce presign URLs,
  // we need to instantiate a SignatureV4 object.
  const signer = new SignatureV4({
    service: "s3",
    region: awsConfig.region,
    credentials: {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
      sessionToken: awsConfig.sessionToken,
    },
  });

  // We can now use the signer to produce a presign URL.
  const signedRequest = signer.presign(
    /**
     * HTTP request description
     */
    {
      /**
       * The HTTP method we will use in the request.
       */
      method: "GET",

      /**
       * The endpoint of the service we will be making the request to.
       *
       * The endpoint is instantiated from a URL string, of the format: `{scheme}://{hostname}[:{port}]`
       */
      endpoint: new Endpoint("https://s3.us-east-1.amazonaws.com"),

      /**
       * The path of the request.
       */
      path: "/my-bucket/bonjour.txt",

      /**
       * The headers we will be sending in the request.
       *
       * Note that in the specific case of this example, requesting
       * an object from S3, we want to set the `x-amz-content-sha256`
       * header to `UNSIGNED_PAYLOAD`. That way, we bypass the payload
       * hash calculation, and communicate that value instead, as specified.
       */
      headers: { [AMZ_CONTENT_SHA256_HEADER]: "UNSIGNED-PAYLOAD" },

      /**
       * Whether the path should be escaped or not (consult the AWS signature V4
       * documentation for more details).
       */
      uriEscapePath: false,

      /**
       * Whether or not the body's hash should be calculated and included
       * in the request.
       */
      applyChecksum: false,
    },
    /**
     * (optional) Presign operation options.
     */
    {
      /**
       * The number of seconds before the presigned URL expires
       */
      expiresIn: 86400,

      /**
       * A set of strings whose representing headers that should not be hoisted
       * to presigned request's query string. If not supplied, the presigner
       * moves all the AWS-specific headers (starting with `x-amz-`) to the request
       * query string. If supplied, these headers remain in the presigned request's
       * header.
       * All headers in the provided request will have their names converted to
       * lower case and then checked for existence in the unhoistableHeaders set.
       *
       * In the case of presigning S3 URLs, the body needs to be empty.
       * however, the AMZ_CONTENT_SHA256_HEADER needs to be set to
       * UNSIGNED_PAYLOAD. To do this, we need to set the header,
       * but declare it as unhoistable, and unsignable.
       */
      unhoistableHeaders: new Set([AMZ_CONTENT_SHA256_HEADER]),

      /**
       * A set of strings whose members represents headers that cannot be signed.
       * All headers in the provided request will have their names converted to
       * lower case and then checked for existence in the unsignableHeaders set.
       *
       * In the case of presigning S3 URLs, the body needs to be empty.
       * however, the AMZ_CONTENT_SHA256_HEADER needs to be set to
       * UNSIGNED_PAYLOAD. To do this, we need to set the header,
       * but declare it as unhoistable, and unsignable.
       */
      unsignableHeaders: new Set([AMZ_CONTENT_SHA256_HEADER]),

      /**
       * A set of strings whose members represents headers that should be signed.
       * Any values passed here will override those provided via unsignableHeaders,
       * allowing them to be signed.
       *
       * All headers in the provided request will have their names converted to
       * lower case before signing.
       */
      signableHeaders: new Set(),

      /**
       * The date and time to be used as signature metadata. This value should be
       * a Date object, a unix (epoch) timestamp, or a string that can be
       * understood by the JavaScript `Date` constructor.If not supplied, the
       * value returned by `new Date()` will be used.
       */
      signingDate: new Date(),

      /**
       * The service signing name. It will override the service name of the signer
       * in current invocation
       */
      signingService: "s3",

      /**
       * The signingRegion and signingService options let the user
       * specify a different region or service to presign the request for.
       */
      signingRegion: "us-east-1",
    },
  );

  console.log(`presigned URL: ${signedRequest.url}`);

  /**
   * Our URL is now ready to be used.
   */
  const res = http.get(signedRequest.url, {
    headers: signedRequest.headers,
  });

  check(res, { "status is 200": (r) => r.status === 200 });
}
