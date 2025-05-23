# Contributing

## Adding a new service

If the jslib-aws does not support the service you need yet, the best way to get it to help is by contributing to it.

### Useful information

1. The project uses the [TypeScript](https://www.typescriptlang.org/) language. [TypeScript](https://www.typescriptlang.org/) is a superset of the Javascript language and essentially adds static typing and functional constructs to the language. It compiles into Javascript, which is then used by the k6 runtime.
2. The project files should be formatted using the [Deno fmt](https://deno.com/) command.
3. The project uses esbuild to produce build files. The project has a `build.mjs` file containing the tool's configuration. Each service is built into its dedicated file, and an overarching `aws.js` contains them for convenience.
4. To allow easier testing, files in the `src` directory are organized in a public/private structure. Files at the root of the folder are the public files; they import the content of the internal (private) directory and explicitly export the symbols that should be made available to the user. The internal files are the ones that contain the actual implementation of the service. The internal files are not exported and are not meant to be used directly by the user.
5. The project is tested in an end2end fashion using the [k6](https://k6.io/) tool. The tests live in the `tests` directory. The tests are written in Javascript and use the [k6 chai js](https://grafana.com/docs/k6/latest/javascript-api/jslib/k6chaijs) jslib to test the functionality of the library. The `deno task test` command runs the test suites. The tests run in a docker container, and the `docker-compose.yml` file contains the configuration for the container. The docker-compose setup spins up a [localstack](https://github.com/localstack/localstack) setup, which emulates AWS locally, and the test script performs its assertions against it directly.

### Conventions

1. The project uses the [kebab-case](https://en.wikipedia.org/wiki/Letter_case#Kebab_case) naming convention for files and directories.
2. The project uses the [pascal-case](https://www.theserverside.com/definition/Pascal-case) naming convention for classes, interfaces, and types.
3. Service client class names should be of the form `ServiceNameClient`, where `ServiceName` is the name of the service, in [pascal-case](https://www.theserverside.com/definition/Pascal-case), or all capitalized if it is an acronym (as in: `KMSClient`, `S3Client`, `SQSClient`, etc.).

### How to add a new service

1. Create a new file in the `src/internal` directory. The file's name should be the service's name in [kebab-case](https://en.wikipedia.org/wiki/Letter_case#Kebab_case). For example, if you want to add support for the `AWS Systems Manager` service, the file should be named `systems-manager.ts`.
2. The file should expose a service client class following the above conventions. The class should inherit from `AWSClient`, and its constructor should take an `AWSConfig` object as its only argument.
3. For each service operation (action) the author wishes to implement, the service class should implement a dedicated public method.
4. Most service operations require signing requests using the AWS V4 signature process. The `SignatureV4` construct exposed in the [`src/internal/signature.ts`](https://github.com/grafana/k6-jslib-aws/blob/main/src/internal/signature.ts#L9) file allows signing requests to AWS services easily. Checkout the existing service implementations for examples of how to use it: [in S3Client](https://github.com/grafana/k6-jslib-aws/blob/main/src/internal/s3.ts#L48), and [in SecretsManagerService](https://github.com/grafana/k6-jslib-aws/blob/main/src/internal/secrets-manager.ts#L63) for instance.
5. Add a new [entrypoint](https://esbuild.github.io/api/#entry-points) in `build.mjs` to the service you created in Step 1.
6. Tests verifying that the service class works as expected should be added in the `tests/internal` directory. The dedicated test file should follow the same naming convention as the service class file, except it should have the `.js` extension. For example, if the service class file is named `systems-manager.ts`, the test file should be called `systems-manager.js`.
7. Test files should consists in a k6 script using the [k6 chai js](https://grafana.com/docs/k6/latest/javascript-api/jslib/k6chaijs) library, and exporting a single `{serviceName}TestSuite(data)` function. This function should consist of a set of `describe` statements containing the actual test assertions, as demonstrated in the [existing s3 test suite](https://github.com/grafana/k6-jslib-aws/blob/main/tests/internal/s3.js). The test suite should be imported and called in the [`tests/internal/index.js`](https://github.com/grafana/k6-jslib-aws/blob/main/tests/index.js) test script, which is the entry point for the test suite.
8. If the tests depend on a specific pre-existing state of the localstack setup, you can add a dedicated script in the `tests/internal/localstack_init` folder. Localstack will execute all the commands present in this script during its setup phase.
9. The `deno task test` command runs the test suite. This command will build the project and run the tests against the spun-up localstack docker container. The `docker-compose.yml` file contains the configuration for the container.
10. Once the tests pass, the `src/index.ts` file should export the service class in the `src/index.ts` file so the user can use it.
11. To get the build system to produce a build of your new service, run `deno task build`.

### Publishing a new version

#### Expectations

1. The service should have tests.
2. The service should have documentation.
3. The service should be re-exported in the `src/index.ts` file.
4. The service should be exposed in the `aws.js` file in the `dist` directory when running the `deno task build` command.
5. The service should produce a dedicated `{service-name}.js` file in the `dist` directory when running the `deno task build` command.
6. The service should produce source map files for the dedicated `{service-name}.js` file and the `aws.js` file in the `dist` directory when running the `deno task build` command.

#### Steps

### Prepare a version PR

In a PR:

1. Bump the version in the `deno.json` file.
2. Run the `deno update` command to update the `deno-lock.json` file.
3. Run the `deno task build` command to ensure the build system produces the latest distributable files.
4. Search and replace every occurrence of the previous version in the `README.md` file with the new version.
5. Search and replace every occurrence of the previous version in the `/examples` directory with the new version.

### Create a tag and GitHub version

1. Tag the latest main branch's commit with the new version, following the [semantic versioning](https://semver.org/) convention, prefixed with a `v` character, as in: `v0.7.1`.
2. The [release.yml](.github/workflows/release.yml) workflow will automatically create a GitHub release with the new version.

### Publishing the new version

1. Open a PR on the [jslib repository](https://github.com/grafana/jslib.k6.io) using the files from the [latest release](https://github.com/grafana/k6-jslib-aws/releases),
and following the [new version instructions](https://github.com/grafana/jslib.k6.io#updating-a-version-of-a-js-package-listed-in-packagejson-dependencies).
2. Make sure the k6 documentation website is updated to include the new version of the library:
    1. The documented API should reflect the new version.
    2. All the links to the library should point to the new version.
