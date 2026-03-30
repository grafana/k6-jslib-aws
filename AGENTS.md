# k6-jslib-aws

TypeScript library that lets k6 load test scripts interact with AWS services (S3, SQS, KMS, Lambda, Kinesis, EventBridge, SecretsManager, SSM). Distributed as bundled ESM via the k6 jslib CDN.

## Architecture

Every AWS service client inherits from a base client that handles endpoint construction and k6 HTTP error classification. Each client creates its own signature instance configured for that service's signing requirements. All requests are signed with AWS Signature V4 before being dispatched via k6's HTTP module.

The signing process has service-specific variations. S3 disables URI path escaping (paths with double slashes are preserved literally, not normalized) and always applies body checksums. All other services normalize URI paths (collapsing dot segments) and double-encode them for the canonical request.

The base client forces `responseType: "text"` on all HTTP requests. This overrides k6's global `discardResponseBodies` option so that library calls always receive response data. S3's getObject overrides this to "binary" for raw data retrieval. If you add a new service that returns binary data, you must override the base request params or responses will be silently truncated/corrupted.

The library is built with esbuild into standalone ES modules, one per service plus an index bundle that contains everything. Users import individual service bundles from the CDN. The build is configured for browser platform (k6's JS runtime model) and marks k6 and jslib URLs as external dependencies.

Tests are end-to-end k6 scripts that run against LocalStack. There are no unit tests. Test data is seeded by shell scripts that run when the LocalStack container starts. Tests import from the built dist/ directory, not from source.

## Gotchas

The signature implementation uses k6's crypto module, which returns a custom `bytes` type (number array) from HMAC operations. The signing key derivation chains four HMAC operations, converting between bytes, Uint8Array, and ArrayBuffer at each step. If k6 changes the crypto module's return type, the entire signing chain breaks silently (wrong signatures, not crashes).

S3 XML response parsing uses k6's `parseHTML` (not a proper XML parser). It works because S3 responses have simple structure, but it may break on responses with XML namespaces or complex nested elements that a real XML parser would handle differently.

Adding a new AWS service requires coordinated changes in five places: the internal implementation, a re-export file at the src root, the barrel export in the index, a build entry point, and a test suite registered in the test runner. Missing any one of these means the service exists but is not importable or testable.

The LocalStack test setup uses a fixed sleep (15s locally, 30s in CI) instead of a health check to wait for initialization. Tests will fail intermittently if LocalStack init scripts take longer than expected, with no retry mechanism.

Publishing a new version requires opening a PR on a separate repository (the jslib CDN repo) with the built artifacts. The version number must be updated in the Deno config, and all version references across README and examples must be manually updated to match.
