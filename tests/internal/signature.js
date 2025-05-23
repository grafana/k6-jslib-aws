import {
  AMZ_ALGORITHM_QUERY_PARAM,
  AMZ_CONTENT_SHA256_HEADER,
  AMZ_CREDENTIAL_QUERY_PARAM,
  AMZ_DATE_HEADER,
  AMZ_DATE_QUERY_PARAM,
  AMZ_EXPIRES_QUERY_PARAM,
  AMZ_SIGNATURE_QUERY_PARAM,
  AMZ_SIGNED_HEADERS_QUERY_PARAM,
  AMZ_TOKEN_QUERY_PARAM,
  AUTHORIZATION_HEADER,
  Endpoint,
  HOST_HEADER,
  SignatureV4,
  SIGNING_ALGORITHM_IDENTIFIER,
  UNSIGNED_PAYLOAD,
} from "../../dist/signature.js";

import {
  describe,
  expect,
} from "https://jslib.k6.io/k6chaijs/4.3.4.0/index.js";

const credentials = {
  accessKeyId: "foo",
  secretAccessKey: "bar",
};

const signerInit = {
  service: "foo",
  region: "us-bar-1",
  credentials: credentials,
};

const signer = new SignatureV4(signerInit);

const minimalRequest = {
  method: "POST",
  endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
  path: "/",
  headers: {
    host: "foo.us-bar-1.amazonaws.com",
  },
};

export function signatureV4TestSuite() {
  describe("SignatureV4", () => {
    describe("#sign", () => {
      describe("#sign should sign requests without bodies", () => {
        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=1e3b24fcfd7655c0c245d99ba7b6b5ca6174eab903ebfbda09ce457af062ad30",
        );
      });

      describe("#sign should sign requests to target endpoint different from host (proxy use case)", () => {
        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://target-foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=1e3b24fcfd7655c0c245d99ba7b6b5ca6174eab903ebfbda09ce457af062ad30",
        );
      });

      describe("#sign should support overriding region and service in the signer instance", () => {
        const signer = new SignatureV4({
          credentials: credentials,
          service: "qux",
          region: "us-foo-1",
        });

        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
            signingService: signerInit.service,
            signingRegion: signerInit.region,
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=1e3b24fcfd7655c0c245d99ba7b6b5ca6174eab903ebfbda09ce457af062ad30",
        );
      });

      describe("#sign should sign requests without host header", () => {
        const request = JSON.parse(JSON.stringify(minimalRequest));
        delete request.headers[HOST_HEADER];

        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {},
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=1e3b24fcfd7655c0c245d99ba7b6b5ca6174eab903ebfbda09ce457af062ad30",
        );

        expect(headers).to.have.property(HOST_HEADER);
        expect(headers[HOST_HEADER]).to.not.be.undefined;
        expect(headers[HOST_HEADER]).to.not.be.null;
        expect(headers[HOST_HEADER]).to.not.be.empty;
      });

      describe("#sign should sign requests with string bodies", () => {
        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
            body: "It was the best of times, it was the worst of times",
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=cf22a0befff359388f136b158f0b1b43db7b18d2ca65ce4112bc88a16815c4b6",
        );
      });

      describe("#sign should sign requests with binary bodies", () => {
        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
            body: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=89f092f52faedb8a6be1890b2a511b88e7998389d62bd7d72915e2f4ee271a64",
        );
      });

      describe("#sign should sign with unsigned bodies when instructed", () => {
        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
              [AMZ_CONTENT_SHA256_HEADER]: UNSIGNED_PAYLOAD,
            },
            body: "It was the best of times, it was the worst of times",
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=2d17bf1aa1624819549626389790503937599b27a998286e0e190b897b1467dd",
        );
        expect(headers[AMZ_CONTENT_SHA256_HEADER]).to.equal(UNSIGNED_PAYLOAD);
      });

      describe("#sign should set the x-amz-date header", () => {
        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
          },
        );

        expect(headers[AMZ_DATE_HEADER]).to.equal("20000101T000000Z");
      });

      describe("#sign should set the x-amz-token header if the credentials have a session token", () => {
        const signer = new SignatureV4({
          service: "foo",
          region: "us-bar-1",
          credentials: {
            accessKeyId: "foo",
            secretAccessKey: "bar",
            sessionToken: "baz",
          },
        });

        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=4fd09a8cf3b28a62a9c6c424f03ababcd703528578bc6ec9184fc585f18c3fbb",
        );
      });

      describe("#sign should allow specifying custom unsignable headers", () => {
        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
              foo: "bar",
              "user-agent": "baz",
            },
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
            unsignableHeaders: new Set(["user-agent"]),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=foo;host;x-amz-content-sha256;x-amz-date, Signature=b053cb495ff12f2615f440a66745fec3010c9ef8824587556477c9d0159afc8e",
        );
      });

      describe("#sign should allow specifying custom signable headers to override custom and always unsignable ones", () => {
        const { headers } = signer.sign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
              foo: "bar",
              "user-agent": "baz",
            },
          },
          {
            signingDate: new Date("2000-01-01T00:00:00Z"),
            unsignableHeaders: new Set(["foo"]),
            signableHeaders: new Set(["foo", "user-agent"]),
          },
        );

        expect(headers[AUTHORIZATION_HEADER]).to.equal(
          "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=foo;host;user-agent;x-amz-content-sha256;x-amz-date, Signature=7ab8a270e30046c718408d1a0c015f5ed822fca59c446cd579fc7461257b7333",
        );
      });

      describe("URI encoding paths", () => {
        const signingOptions = {
          signingDate: new Date("2000-01-01T00:00:00.000Z"),
        };

        describe("should URI-encode the path by default", () => {
          const { headers } = signer.sign(
            {
              method: "POST",
              endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
              path: "/foo%3Dbar",
              headers: {
                host: "foo.us-bar-1.amazonaws.com",
              },
            },
            signingOptions,
          );

          expect(headers[AUTHORIZATION_HEADER]).to.equal(
            "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=fb4948cab44a9c47ce3b1a2489d01ec939fea9e79eccdb4593c11a94f207e075",
          );
        });

        describe("should normalize relative path by default", () => {
          const { headers } = signer.sign(
            {
              method: "POST",
              endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
              path: "/abc/../foo%3Dbar",
              headers: {
                host: "foo.us-bar-1.amazonaws.com",
              },
            },
            signingOptions,
          );

          expect(headers[AUTHORIZATION_HEADER]).to.contain(
            "Signature=fb4948cab44a9c47ce3b1a2489d01ec939fea9e79eccdb4593c11a94f207e075",
          );
        });

        describe("should normalize path with consecutive slashes by default", () => {
          const { headers } = signer.sign(
            {
              method: "POST",
              endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
              path: "//foo%3Dbar",
              headers: {
                host: "foo.us-bar-1.amazonaws.com",
              },
            },
            signingOptions,
          );

          expect(headers[AUTHORIZATION_HEADER]).to.contain(
            "Signature=fb4948cab44a9c47ce3b1a2489d01ec939fea9e79eccdb4593c11a94f207e075",
          );
        });

        describe("should not URI-encode the path if URI path escaping was disabled on the signer", () => {
          // Setting `uriEscapePath` to `false` creates an
          // S3-compatible signer. The expected authorization header
          // included below was calculated using the
          // `Aws\Signature\S3SignatureV4` class from the AWS SDK for
          // PHP
          const signer = new SignatureV4({
            service: "foo",
            region: "us-bar-1",
            credentials: {
              accessKeyId: "foo",
              secretAccessKey: "bar",
            },
            uriEscapePath: false,
          });

          const request = JSON.parse(JSON.stringify(minimalRequest));
          request.headers["X-Amz-Content-Sha256"] =
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

          const { headers } = signer.sign(
            {
              method: "POST",
              endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
              path: "/foo%3Dbar",
              headers: {
                host: "foo.us-bar-1.amazonaws.com",
                "X-Amz-Content-Sha256":
                  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              },
            },
            {
              signingDate: new Date("2000-01-01T00:00:00.000Z"),
            },
          );

          expect(headers[AUTHORIZATION_HEADER]).to.equal(
            "AWS4-HMAC-SHA256 Credential=foo/20000101/us-bar-1/foo/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=0d859e5a74374efc2c9f14ba9352df14c68e411a1f44bd639fdd024e5f7b7ef1",
          );
        });
      });
    });

    describe("#presign", () => {
      const presigningOptions = {
        expiresIn: 1800,
        signingDate: new Date("2000-01-01T00:00:00Z"),
      };

      describe("should pre-sign requests without doubling encoding the url terminal slash", () => {
        const { query, url } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com/"),
            path: "/foo.txt",
            headers: {},
          },
          presigningOptions,
        );

        const expectedURL = "https://foo.us-bar-1.amazonaws.com/foo.txt" +
          "?X-Amz-Algorithm=AWS4-HMAC-SHA256" +
          "&X-Amz-Credential=foo%2F20000101%2Fus-bar-1%2Ffoo%2Faws4_request" +
          "&X-Amz-Date=20000101T000000Z" +
          "&X-Amz-Expires=1800" +
          "&X-Amz-Signature=c910d7bc4a4f9d5f3db5b0c266d78ddf2c61d0a77628d3adc342e2159ce19895" +
          "&X-Amz-SignedHeaders=host";

        console.log(`url: ${url}`);
        console.log(`expected url: ${expectedURL}`);
        expect(url).to.equal(expectedURL);
        expect(query).to.deep.equal({
          [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
          [AMZ_CREDENTIAL_QUERY_PARAM]:
            "foo/20000101/us-bar-1/foo/aws4_request",
          [AMZ_DATE_QUERY_PARAM]: "20000101T000000Z",
          [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
          [AMZ_SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
          [AMZ_SIGNATURE_QUERY_PARAM]:
            "c910d7bc4a4f9d5f3db5b0c266d78ddf2c61d0a77628d3adc342e2159ce19895",
        });
      });

      describe("should presign requests without bodies", () => {
        const { query } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          presigningOptions,
        );

        expect(query).to.deep.equal({
          [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
          [AMZ_CREDENTIAL_QUERY_PARAM]:
            "foo/20000101/us-bar-1/foo/aws4_request",
          [AMZ_DATE_QUERY_PARAM]: "20000101T000000Z",
          [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
          [AMZ_SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
          [AMZ_SIGNATURE_QUERY_PARAM]:
            "46f0091f3e84cbd4552a184f43830a4f8b42fd18ceaefcdc2c225be1efd9e00e",
        });
      });

      describe("should presign requests to target endpoint different from host (proxy use case)", () => {
        const { query } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://target-foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          presigningOptions,
        );

        expect(query).to.deep.equal({
          [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
          [AMZ_CREDENTIAL_QUERY_PARAM]:
            "foo/20000101/us-bar-1/foo/aws4_request",
          [AMZ_DATE_QUERY_PARAM]: "20000101T000000Z",
          [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
          [AMZ_SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
          [AMZ_SIGNATURE_QUERY_PARAM]:
            "46f0091f3e84cbd4552a184f43830a4f8b42fd18ceaefcdc2c225be1efd9e00e",
        });
      });

      describe("should sign request without hoisting some headers", () => {
        const options = JSON.parse(JSON.stringify(presigningOptions));
        options.unhoistableHeaders = new Set(["x-amz-not-hoisted"]);

        const { query, headers } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
              "x-amz-not-hoisted": "test",
            },
          },
          options,
        );

        expect(query).to.deep.equal({
          [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
          [AMZ_CREDENTIAL_QUERY_PARAM]:
            "foo/20000101/us-bar-1/foo/aws4_request",
          [AMZ_DATE_QUERY_PARAM]: "20000101T000000Z",
          [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
          [AMZ_SIGNED_HEADERS_QUERY_PARAM]: `${HOST_HEADER};x-amz-not-hoisted`,
          [AMZ_SIGNATURE_QUERY_PARAM]:
            "3c3ef586754b111e9528009710b797a07457d6a671058ba89041a06bab45f585",
        });

        expect(headers).to.have.own.property("x-amz-not-hoisted");
        expect(headers["x-amz-not-hoisted"]).to.equal("test");
      });

      describe("should support overriding region and service in the signer instance", () => {
        const signer = new SignatureV4({
          service: "foo",
          region: "us-bar-1",
          credentials: credentials,
        });

        const options = JSON.parse(JSON.stringify(presigningOptions));
        options.signingService = signerInit.service;
        options.signingRegion = signerInit.region;

        const { query } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          options,
        );

        expect(query).to.deep.equal({
          [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
          [AMZ_CREDENTIAL_QUERY_PARAM]:
            "foo/20000101/us-bar-1/foo/aws4_request",
          [AMZ_DATE_QUERY_PARAM]: "20000101T000000Z",
          [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
          [AMZ_SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
          [AMZ_SIGNATURE_QUERY_PARAM]:
            "46f0091f3e84cbd4552a184f43830a4f8b42fd18ceaefcdc2c225be1efd9e00e",
        });
      });

      describe("should default expires to 3600 seconds if not explicitly passed", () => {
        const { query } = signer.presign({
          method: "POST",
          endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
          path: "/",
          headers: {
            host: "foo.us-bar-1.amazonaws.com",
          },
        });

        expect(query).to.have.own.property(AMZ_EXPIRES_QUERY_PARAM);
        expect(query[AMZ_EXPIRES_QUERY_PARAM]).to.equal("3600");
      });

      describe("should sign requests with string bodies", () => {
        const { query } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
            body: "It was the best of times, it was the worst of times",
          },
          presigningOptions,
        );

        expect(query).to.deep.equal({
          [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
          [AMZ_CREDENTIAL_QUERY_PARAM]:
            "foo/20000101/us-bar-1/foo/aws4_request",
          [AMZ_DATE_QUERY_PARAM]: "20000101T000000Z",
          [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
          [AMZ_SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
          [AMZ_SIGNATURE_QUERY_PARAM]:
            "3a7fc2cef9cab09384d0ef7a69bab0d942996846422bd041da5e52cae82612c3",
        });
      });

      describe("should sign requests with binary bodies", () => {
        const { query } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
            body: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
          },
          presigningOptions,
        );

        expect(query).to.deep.equal({
          [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
          [AMZ_CREDENTIAL_QUERY_PARAM]:
            "foo/20000101/us-bar-1/foo/aws4_request",
          [AMZ_DATE_QUERY_PARAM]: "20000101T000000Z",
          [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
          [AMZ_SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
          [AMZ_SIGNATURE_QUERY_PARAM]:
            "bd1427cfdc9a3b0a55609b0114d1dab4dfebca81a9496d6c47dedf65a3ec3bcb",
        });
      });

      describe("should set and sign the x-amz-token header if the credentials have a session token", () => {
        const signer = new SignatureV4({
          service: "foo",
          region: "us-bar-1",
          credentials: {
            accessKeyId: "foo",
            secretAccessKey: "bar",
            sessionToken: "baz",
          },
        });

        const { query } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
            },
          },
          presigningOptions,
        );

        expect(query).to.deep.equal({
          [AMZ_TOKEN_QUERY_PARAM]: "baz",
          [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
          [AMZ_CREDENTIAL_QUERY_PARAM]:
            "foo/20000101/us-bar-1/foo/aws4_request",
          [AMZ_DATE_QUERY_PARAM]: "20000101T000000Z",
          [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
          [AMZ_SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
          [AMZ_SIGNATURE_QUERY_PARAM]:
            "1b57912615b8e7ae78790ba713193d34baa793d6be2a1b18370dd27dce2d05a7",
        });
      });

      //         // FIXME: this test returns the wrong signature hash
      //         //     describe('should use the precalculated payload checksum if provided', () => {
      //         //         const request = JSON.parse(JSON.stringify(minimalRequest))
      //         //         request.body = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
      //         //         request.headers[AMZ_CONTENT_SHA256_HEADER] = UNSIGNED_PAYLOAD

      //         //         console.log(`request: ${JSON.stringify(request)}`)
      //         //         const { query } = signer.presign(request, presigningOptions)

      //         //         expect(query).to.deep.equal({
      //         //             [AMZ_CONTENT_SHA256_HEADER]: UNSIGNED_PAYLOAD,
      //         //             [AMZ_ALGORITHM_QUERY_PARAM]: SIGNING_ALGORITHM_IDENTIFIER,
      //         //             [AMZ_CREDENTIAL_QUERY_PARAM]: 'foo/20000101/us-bar-1/foo/aws4_request',
      //         //             [AMZ_DATE_QUERY_PARAM]: '20000101T000000Z',
      //         //             [AMZ_EXPIRES_QUERY_PARAM]: presigningOptions.expiresIn.toString(),
      //         //             [AMZ_SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
      //         //             [AMZ_SIGNATURE_QUERY_PARAM]:
      //         //                 '04ccc7891757c0ca3811d0e018e4655919ef11fa7b956fe9b782f273cec2374f',
      //         //         })
      //         //     })

      describe("should allow specifying custom unsignable headers", () => {
        const options = JSON.parse(JSON.stringify(presigningOptions));
        options.unsignableHeaders = new Set(["foo"]);

        const { headers: headersAsSigned, query } = signer.presign(
          {
            method: "POST",
            endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
            path: "/",
            headers: {
              host: "foo.us-bar-1.amazonaws.com",
              foo: "bar",
              "user-agent": "baz",
            },
          },
          options,
        );

        expect(query).to.have.property(AMZ_SIGNED_HEADERS_QUERY_PARAM, "host");
        expect(headersAsSigned).to.deep.equal({
          host: "foo.us-bar-1.amazonaws.com",
          foo: "bar",
          "user-agent": "baz",
        });
      });

      describe("should fail if the expiresIn is more than a week in the future", () => {
        const options = JSON.parse(JSON.stringify(presigningOptions));
        options.expiresIn = 7 * 24 * 60 * 60 + 1;

        expect(() => {
          signer.presign(
            {
              method: "POST",
              endpoint: new Endpoint("https://foo.us-bar-1.amazonaws.com"),
              path: "/",
              headers: {
                host: "foo.us-bar-1.amazonaws.com",
              },
            },
            options,
          );
        }).to.throw();
      });

      //         // TODO: test paths URI encoding?
    });
  });
}
