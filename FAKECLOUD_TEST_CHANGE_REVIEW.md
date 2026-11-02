# Fakecloud test-change inventory

Snapshot: 2026-10-30, branch `test/fakecloud`, uncommitted changes relative
to its base, `origin/main` at `abfe3d2`.

This document records the proposed changes, not approval to keep them. IDs are
stable discussion references. No tests or implementation files were changed
while preparing this inventory.

## Scope and classification

| Label | Meaning |
| --- | --- |
| Fixture plumbing | Changes how resources, credentials, and identifiers reach tests. Can potentially live in external provisioning instead of test JavaScript. |
| Test fix | Corrects or strengthens what a test exercises. A candidate for separate review from the emulator switch. |
| Emulator compatibility | Accommodates behavior observed with fakecloud. Not evidence that the library itself is incorrect. |
| Infrastructure | Changes the emulator, startup, or local/CI execution. |
| Implementation | Changes shipped library behavior, not just tests. Needs separate consideration. |

“Required” below means required by the current proposed arrangement, not the
only possible way to migrate. In particular, moving fixture creation into k6
was an implementation choice. An external setup script or setup container is
an alternative.

The Cognito-branch runs supplied the earlier failure evidence. This new branch
has only had JavaScript syntax, ZIP-header, and whitespace checks; its full
integration suite, including the newly provisioned DynamoDB fixtures, has not
been run here. No Cognito implementation or suite was added to this branch.

## Existing test runner: `tests/index.js`

### RUN-01 — Replace LocalStack startup comments

The header now describes fakecloud and k6 `setup()` rather than container-start
shell scripts. This is documentation of RUN-05, with no direct runtime effect.
Classification: fixture plumbing; keep only if that setup design is retained.

### RUN-02 — Allow an endpoint override

The fixed endpoint becomes
`__ENV.AWS_TEST_ENDPOINT || "http://localhost.localstack.cloud:4566"`.
The default hostname and region stay the same. This permits testing a separate
fresh instance without editing the file. Regional S3 subdomains must still
resolve correctly; an arbitrary endpoint is not automatically compatible.
Classification: optional fixture plumbing, not essential to an image switch.

### RUN-03 — Replace dummy credentials; remove the dummy session token

The initial config now uses `test-bootstrap-key` and `test-bootstrap-secret`.
These are intended for fakecloud's reserved bootstrap identity. Service tests
subsequently use IAM-generated credentials, not these values.

The former `sessionToken: "sessiontoken"` is removed. Consequently, these
integration requests no longer exercise attaching a session token. This is a
coverage difference, not just a credential rename. The signature test file is
unchanged, but this inventory does not claim it replaces all of that coverage.
Classification: fixture plumbing tied to the credential strategy; review the
session-token trade-off separately.

### RUN-04 — Replace hard-coded SQS URLs with fixture output

The static `sqs.testQueues` object is replaced by `sqs: {}` at initialization.
Before running suites, `fixtures.testQueues` populates it. URLs now originate
from `CreateQueue` responses rather than a LocalStack-specific URL template.
The mapping also gains `standardSend`, consumed by SQS-03 through SQS-06.
Classification: fixture plumbing; external setup could supply these instead.

### RUN-05 — Add exported `setup()` and its import

`setup()` calls `setupFixtures(awsConfig, testData)` and returns its output.
Resource creation moves from LocalStack startup hooks to the k6 setup phase.
An uncaught fixture error aborts setup rather than allowing tests to proceed
against partial initialization. The fixture routines expect a fresh emulator;
they do not implement general rerun/idempotency or teardown support.
Classification: fixture plumbing; a design choice, not a prerequisite for
fakecloud itself.

### RUN-06 — Inject generated credentials and resource IDs

The default function now accepts setup output. It reconstructs `AWSConfig`
with generated credentials, copies queue URLs into test data, and adds
`testData.kms.keyId`. Reconstructing the config avoids relying on serialized
class instances being restored by setup-data transport.
Classification: fixture plumbing, dependent on RUN-03 through RUN-05 and used
by the SQS/KMS changes below.

### RUN-07 — Turn an escaping suite exception into a failed check

A `try/catch` surrounds suite execution. The catch emits a failed
`all service suites completed` check, then rethrows. This makes an exception
escaping a suite count against the existing `checks: ["rate>=1"]` threshold.
It does not replace the existing per-case handling in `asyncDescribe`, which
normally catches individual case failures. Suite registration and execution
order, including DynamoDB, are otherwise unchanged.
Classification: optional test-runner hardening; not specific to fakecloud.

## Existing SQS tests: `tests/internal/sqs.js`

### SQS-01 — Assert an error code instead of exact message prose

The invalid-receipt-handle test still requires `SQSServiceError`. It replaces
the exact message assertion with
`error.code.split(".").pop() === "ReceiptHandleIsInvalid"`.
Earlier runs returned a different sentence for the same failure. Splitting
allows an optional dotted namespace on the code.

Trade-off: the test checks error classification instead of exact wording; it
no longer detects a change in that sentence. Classification: emulator
compatibility with a more targeted error assertion; independently reviewable.

### SQS-02 — Compare queue membership without list-order assumptions

`listQueues` still requires exactly five URLs. Instead of five positional
name assertions, it extracts basenames, sorts them, and compares with the
complete expected list. Explicit string assertions on the first two extracted
names disappear; the new extraction and exact-name comparison still reject
incorrect names.

This retains the expected queue set and count, while intentionally ceasing to
test the order in which the emulator returns it. Classification: test fix for
the suite's ordering assumption; a candidate for a separate change.

### SQS-03 — Select the standard fixture for `sqs.sendMessage`

Replaces `await listQueues(); queues.urls[0]` with
`data.sqs.testQueues.standardSend`. The body and result assertions stay the
same. Earlier fakecloud runs returned the FIFO queue first, leading to a
missing-`MessageGroupId` error unrelated to the intended standard-queue test.
Classification: test fix plus fixture wiring; depends on RUN-04.

### SQS-04 — Select the standard fixture for `sqs.sendMessageWithAttributes`

Makes the same queue-selection change as SQS-03. Message attributes and
assertions are unchanged. Classification: test fix plus fixture wiring.

### SQS-05 — Select the standard fixture for `sqs.sendMessageBatch successful`

Makes the same queue-selection change as SQS-03. The two batch messages and
their success/MD5 assertions are unchanged. Classification: test fix plus
fixture wiring.

### SQS-06 — Select the standard fixture for duplicate batch IDs

Makes the same queue-selection change as SQS-03. The duplicate IDs and
`SQSServiceError` assertion remain. This removes queue type as a competing
reason for rejection, although the existing assertion still does not prove
the precise duplicate-ID error code. Classification: test fix plus fixture
wiring; no new error-code assertion was added here.

## Existing KMS tests: `tests/internal/kms.js`

### KMS-01 — Find the fixture key instead of requiring exactly one key

`kms.listKeys` keeps the array assertion, then searches for
`data.kms.keyId`. It checks that the matching entry is an object, has that ID,
and has a nonempty ARN. It removes the exact total of one key and the
first-entry assumptions. Earlier runs contained two keys; service activity
can introduce keys besides the explicitly seeded one.

Trade-off: unrelated extra keys no longer fail this test. This checks fixture
presence rather than the entire inventory size. Classification: test
assumption adjustment plus fixture wiring; depends on RUN-06.

### KMS-02 — Use the known key for `kms.generateDataKey`

The test still lists keys, but selects the entry matching `data.kms.keyId`
instead of `keys[0]`. The generation call and result assertions are unchanged.
Classification: test fix plus fixture wiring; separate from deciding whether
to remove the exact-count assertion in KMS-01.

## Existing Lambda tests: `tests/internal/lambda.js`

### LAMBDA-01 — Require a handler invocation error

Imports `LambdaInvocationError` and changes `lambda.invokeFail` from accepting
any Error to requiring that class. Earlier missing-Docker/routing failures
could satisfy the old assertion even though the failure handler never ran.
This strengthens the assertion; it does not repair Docker access or routing.
Successful invocation, Event, and log assertions are unchanged.
Classification: test fix, suitable for separate review.

## Existing S3 tests: `tests/internal/s3.js`

### S3-01 — Add the region to the test endpoint's service prefix

Changes `s3.<endpoint hostname>` to `s3.<region>.<endpoint hostname>`.
The S3 client uses both path-style and virtual-hosted requests. Earlier runs
with fakecloud misrouted copy/multipart requests under the former hostname;
the regional service prefix addressed that behavior. This changes the test
endpoint, not the library's endpoint construction.
Classification: emulator compatibility; consider whether emulator-side
configuration can preserve the original test endpoint instead.

### S3-02 — Use a fresh multipart-completion object key

The completion case changes `created-by-test.txt` to
`multipart-completion-test.txt`. The former key already exists from an earlier
test. The new key avoids the fakecloud behavior previously observed: an
unknown upload ID can return success when the destination object exists.

This is specifically an emulator workaround, not proof that the original
test expectation is wrong. It stops exercising that existing-object case.
Classification: emulator compatibility; preserve the original failure as a
known compatibility gap if this workaround is removed.

### S3-03 — Check an unknown upload ID before valid completion

After uploading part 1, the test first attempts completion using
`non-existent-upload-id`. Previously the valid upload was completed first.
The new order also keeps the destination absent during this negative check,
working with S3-02 to avoid fakecloud's existing-object behavior.
Classification: emulator compatibility and test sequencing.

### S3-04 — Check a nonexistent part while the upload is active

The missing-part completion attempt now happens before successful completion.
Previously it reused an already-completed upload, so it did not isolate
missing-part validation on an active upload. The associated error variables
were rearranged to retain their meanings.
Classification: test fix, independently useful beyond the emulator switch.

### S3-05 — Correct `etag` to `eTag` in the negative part input

The nonexistent-part input now has
`{ partNumber: 2, eTag: "non-existent-etag" }`. The implementation reads
`part.eTag` when producing completion XML. The old lowercase property supplied
an undefined tag, confounding a nonexistent-part test with malformed input.
Classification: test fix; independent of provisioning and emulator choice.

### S3-06 — Require specific multipart error codes

Both existing `S3ServiceError` instance assertions remain. Added assertions
require `NoSuchUpload` for the unknown upload ID and `InvalidPart` for the
nonexistent part. These strengthen classification checks rather than allowing
any S3 error to pass. Classification: test strengthening; review separately
from S3-02's workaround.

### S3-07 — Complete successfully only after negative checks

The valid completion moves to the final request in the case. Its no-error
assertion remains. This preserves the positive path while allowing S3-03 and
S3-04 to execute under their intended preconditions.
Classification: test sequencing, coupled to those two changes.

### S3-08 — Delete the multipart-completion object

After assertions, the test deletes the new dedicated object. This avoids
leaving another object behind. It is not a `finally` cleanup: an earlier
assertion failure can still leave the object. Classification: test hygiene,
coupled to S3-02's dedicated key.

## New fixture files

These files are all additions. The entries below inventory their distinct
responsibilities, rather than treating them as a single opaque setup change.

### FIX-01 — Signed fixture request helper: `tests/fixtures/request.js`

`fixtureRequest` creates a service-specific `SignatureV4`, supplies the config
endpoint and default `/` path, and dispatches via `http.asyncRequest` with text
responses. It disables URI escaping for S3, matching that service's signing
configuration. Non-2xx responses throw with status/body so provisioning fails
visibly. It imports the built signature bundle.
Classification: fixture plumbing; unnecessary in test JavaScript if an
external tool performs provisioning. Using the library for setup also means a
signing defect can fail setup before service assertions run.

### FIX-02 — JSON fixture protocol wrapper: `tests/fixtures/request.js`

`fixtureJson` adds POST, JSON serialization, `X-Amz-Target`, and JSON response
parsing. Its default media type is `application/x-amz-json-1.1`; DynamoDB
overrides it with `application/x-amz-json-1.0`. This is fixture transport, not a
new public service API. Classification: fixture plumbing.

### FIX-03 — Negative signature preflight: `tests/fixtures/request.js`

`assertSignatureVerification` signs an S3 request using the generated access
key but an intentionally wrong secret. It requires HTTP 403 and a body
containing `SignatureDoesNotMatch`, otherwise setup throws. This checks that
the test backend rejects at least this incorrectly signed request rather
than accidentally accepting all signatures. It is not exhaustive SigV4
conformance coverage. The expected rejected request can contribute to
`http_req_failed`; the suite threshold is on checks.
Classification: additional test-backend validation, not essential fixture
creation. It is explicitly coupled to the expected backend error response.

### FIX-04 — Bootstrap IAM credentials: `tests/fixtures/aws.js`

Adds an IAM Query-protocol helper using URL-encoded Action/Version fields and
XML parsing. It creates `jslib-tests` and an access key, then returns those
credentials for service setup and tests. IAM calls in this helper, including
role creation, use the bootstrap config; other service fixture requests use
the generated credentials. Fixed resource names assume a fresh backend.
Classification: fixture plumbing and a chosen signature-verification strategy.

### FIX-05 — Seed S3: `tests/fixtures/aws.js`

Creates the fixture bucket via a signed PUT, then uploads the three objects
from `testData.s3.testObjects` using `S3Client`. Replaces the active role of
`localstack/init/ready.d/s3.sh` and its files as setup inputs; the legacy files
are retained unchanged. Classification: fixture relocation, not a change to
the S3 assertions.

### FIX-06 — Seed KMS: `tests/fixtures/aws.js`

Creates the test key and `alias/test-key`; returns `KeyMetadata.KeyId` for the
KMS tests and uses it for the secure SSM parameter. This replaces the startup
KMS seed script and exposes a known identifier instead of inferring one from
list order. Classification: fixture relocation plus identifier plumbing.

### FIX-07 — Seed Secrets Manager: `tests/fixtures/aws.js`

Creates `test-secret` and `test-delete-secret`, both with `test-secret-value`.
Replaces the startup secret creation. No changes to the Secrets Manager test
file or assertions. Classification: fixture relocation.

### FIX-08 — Seed SSM: `tests/fixtures/aws.js`

Creates the existing String and SecureString parameter names/values from test
data. Unlike the old shell script, the secure parameter explicitly uses the
fixture KMS key, and requests do not specify overwrite. The original SSM
assertions are unchanged. Classification: fixture relocation plus a key-choice
change; the fresh-instance assumption replaces overwrite-based reruns.

### FIX-09 — Seed SQS and return queue URLs: `tests/fixtures/aws.js`

Creates the same five named queues, setting `FifoQueue: "true"` on `.fifo`
queues. Seeds the standard response, two FIFO responses, and deletion message
with the existing bodies and FIFO group/deduplication values. Uses returned
queue URLs for seeding and returns the test-data mapping, including
`standardSend`. Classification: fixture relocation plus URL discovery.

### FIX-10 — Seed DynamoDB: `tests/fixtures/aws.js`

Creates `test-jslib-aws-table` using String `pk`/`sk` HASH/RANGE keys and
PAY_PER_REQUEST billing. Inserts `tenant#1/item#1/alpha`,
`tenant#1/item#2/beta`, and `tenant#2/item#1/gamma`. These match
`localstack/init/ready.d/dynamo-db.sh`. This was added for the newer base;
`tests/internal/dynamo-db.js` itself is unchanged. No table-readiness polling
is added. Classification: fixture relocation; needs validation in the new run.

### FIX-11 — Seed Lambda and its role: `tests/fixtures/aws.js`

Creates a `lambda-role` with a Lambda trust policy and registers `test-product`
and `test-fail` through Lambda's REST create-function endpoint. The Node.js 18
handlers are inline: one logs the received event and returns the product;
the other throws. ZIPs are generated and base64-encoded in setup instead of
using the startup shell script's `zip` command and handler files.

Creating the IAM role is also new; the old script supplied a fixed ARN. Handler
source now has a second location while the unused legacy files remain.
Classification: fixture relocation plus explicit role provisioning; requires
working host Docker access for subsequent invocation, not merely registration.

### FIX-12 — Build a Lambda ZIP: `tests/fixtures/lambda-zip.js`

Adds a custom, single-file, uncompressed ZIP writer for `index.js`, including
UTF-8 encoding, CRC32, local and central directory records, and the end record.
This avoids needing an external `zip` executable during k6 setup. It is new
test-support code to maintain, not required if fixtures are packaged outside
k6. Classification: fixture plumbing; an external packager is an alternative.

## Related non-test changes already in the working tree

Included to make the eventual split explicit; these are not hidden test edits.

### IMPL-01 — Remove Lambda's `X-Amz-Target`: `src/internal/lambda.ts`

Removes the `AMZ_TARGET_HEADER` import and the outgoing
`AWSLambda.<invocationType>` target header. Invocation still uses the REST
path and invocation/log headers. This addressed routing failures observed
with fakecloud. It changes shipped request behavior, so it should be reviewed
as an implementation change, not described as fixture setup.

### IMPL-02 — Recognize additional JSON error content types: `src/internal/error.ts`

Normalizes the media type by removing parameters, trimming, and lowercasing.
The JSON branch now accepts `application/json`, `application/x-amz-json-*`, and
types ending in `+json`; previously it accepted only an exact
`application/json` header. This exposed useful JSON error messages rather than
falling through to XML parsing. It affects shared library error handling,
not only Lambda. Classification: implementation fix requiring separate review.

### INFRA-01 — Replace the Compose service: `docker-compose.yml`

Replaces pinned LocalStack with fakecloud 0.51.0, retains loopback port 4566,
and removes the legacy external-service port range and startup/data mounts.
Sets fakecloud's bind address, region, account, and signature-verification
flag. Removes the obsolete Compose version field and fixed container name.
LocalStack DEBUG/PERSISTENCE environment forwarding is not retained.
Classification: emulator infrastructure; legacy seed files remain on disk
but are no longer executed by Compose.

### INFRA-02 — Enable Lambda container execution: `docker-compose.yml`

Mounts `/run/docker.sock` at `/var/run/docker.sock`, adds the host-gateway
mapping, and sets `security_opt: label=disable`. The SELinux setting addressed
the user-observed Fedora AVC denying the container's connection to the Docker
daemon. This grants the development emulator access to the host daemon and
reduces SELinux isolation for that container; it is not merely a health fix.
Classification: infrastructure/security choice, separate from test semantics.

### INFRA-03 — Wait for backend health locally: `docker-compose.yml`, `deno.json`

Adds `fakecloud healthcheck` with a 2-second interval, 3-second timeout, and
30 retries. The local test task replaces `sleep 15` with Compose
`--wait --wait-timeout 300`; `down` also gains `--remove-orphans` to remove
obsolete services belonging to this Compose project. `down -v` remains.
Health means the backend is ready; resource provisioning still happens later
in k6 setup. Classification: infrastructure and readiness handling.

### INFRA-04 — Wait for backend health in CI: `.github/workflows/ci.yml`

Adds the same Compose wait flags and removes `sleep 30`. Existing action
versions and `test:ci` command stay unchanged. CI still depends on setup for
resource creation. Classification: infrastructure.

### DOC-01 — Update README and contributor setup guidance

Documents fakecloud, health waiting, fixture creation, generated credentials,
endpoint overrides, and Docker/SELinux access. Contributor instructions direct
new fixtures to `tests/fixtures/aws.js` instead of LocalStack startup scripts.
These descriptions depend on retaining the proposed setup design; they must
change if provisioning moves outside test JavaScript.

## How to use this inventory later

- Review test fixes independently: SQS-02 through SQS-06, KMS-02, LAMBDA-01,
  S3-04 through S3-07, and RUN-07 are candidates, with the dependencies noted
  above. Some currently consume identifiers from the proposed fixture setup.
- Explicitly decide on compatibility/coverage trade-offs: RUN-03, SQS-01,
  KMS-01, S3-01 through S3-03. Do not treat every green run as proof of an
  equivalent replacement.
- Decide where provisioning belongs before keeping RUN-03 through RUN-06
  and FIX-01 through FIX-12. Equivalent external fixtures can avoid much of
  this JavaScript plumbing.
- Review IMPL-01 and IMPL-02 separately from the backend configuration.
- No changes have been selected, reverted, committed, or approved by this
  document. Existing untracked Cognito scratch files and extension checkout
  are outside this inventory and were not changed.
