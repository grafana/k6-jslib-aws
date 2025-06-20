import { HTTPScheme } from "./http.ts";
import { Endpoint } from "./endpoint.ts";

/** Class holding an AWS connection information */
export class AWSConfig {
  /**
   * The AWS region to connect to, as listed: https://docs.aws.amazon.com/general/latest/gr/rande.html
   *
   * @type {string}
   */
  region: string;

  /**
   * Your user's AWS access key id credential.
   *
   * @type {string}
   */
  accessKeyId: string;

  /**
   * Your user's AWS secret access key credential.
   *
   * @type {string}
   */
  secretAccessKey: string;

  /**
   * Your user's AWS session token credential.
   *
   * @type {string}
   */
  sessionToken?: string;

  /**
   * The AWS hostname to connect to.
   *
   * @type {string} ['amazonaws.com']
   */
  endpoint?: Endpoint;

  /**
   * fromEnvironment creates an AWSConfig from the environment variables.
   *
   * It expects to find the following compulsory environment variables:
   *  * AWS_REGION
   *  * AWS_ACCESS_KEY_ID
   *  * AWS_SECRET_ACCESS_KEY
   *
   * If set, the following optional environment variables are also used:
   *  * AWS_SESSION_TOKEN
   *
   * Finally, the options parameter allows to explicitly set the scheme and endpoint
   * to use when connecting to AWS.
   *
   * @param options {AWSConnectionOptions}
   * @returns
   */
  static fromEnvironment(options?: AWSConnectionOptions): AWSConfig {
    const region = __ENV.AWS_REGION;
    const accessKeyId = __ENV.AWS_ACCESS_KEY_ID;
    const secretAccessKey = __ENV.AWS_SECRET_ACCESS_KEY;
    const sessionToken: string | undefined = __ENV.AWS_SESSION_TOKEN;
    const endpoint: Endpoint | string | undefined = options?.endpoint;

    return new AWSConfig({
      region,
      accessKeyId,
      secretAccessKey,
      sessionToken,
      endpoint: endpoint,
    });
  }

  /**
   * Create an AWSConfig.
   *
   * @param {AWSConfigOptions} options - configuration attributes to use when interacting with AWS' APIs
   * @throws {InvalidArgumentException}
   */
  constructor(options: AWSConfigOptions) {
    if (!options.region || options.region === "") {
      throw new InvalidAWSConfigError(
        `invalid AWS region; reason: expected a valid AWS region name (e.g. "us-east-1"), got \`${options.region}\``,
      );
    }

    if (!options.accessKeyId || options.accessKeyId === "") {
      throw new InvalidAWSConfigError(
        `invalid AWS access key ID; reason: expected a non empty string, got \`${options.accessKeyId}\``,
      );
    }

    if (
      options.accessKeyId.length < 16 ||
      (options.accessKeyId.length > 128 && options.sessionToken != undefined)
    ) {
      throw new InvalidAWSConfigError(
        `invalid AWS access key ID; reason: size should be between 16 and 128 characters, got ${options.accessKeyId.length}`,
      );
    }

    if (!options.secretAccessKey || options.secretAccessKey === "") {
      throw new InvalidAWSConfigError(
        `invalid AWS secret access key; reason: expected a non empty string, got \`${options.secretAccessKey}\``,
      );
    }

    this.region = options.region;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;

    if (options.sessionToken !== undefined) {
      this.sessionToken = options.sessionToken;
    }

    if (options.endpoint !== undefined) {
      if (typeof options.endpoint === "string") {
        this.endpoint = new Endpoint(options.endpoint);
      } else {
        this.endpoint = options.endpoint;
      }
    }
  }
}

/**
 * Interface representing AWSConfig options
 */
export interface AWSConfigOptions extends AWSConnectionOptions {
  /**
   * The AWS region to connect to, as listed: https://docs.aws.amazon.com/general/latest/gr/rande.html
   *
   * @type {string}
   */
  region: string;

  /**
   * Your user's AWS access key id credential.
   *
   * @type {string}
   */
  accessKeyId: string;

  /**
   * Your user's AWS secret access key credential.
   *
   * @type {string}
   */
  secretAccessKey: string;

  /**
   * Your user's AWS session token credential.
   *
   * @type {string}
   */
  sessionToken?: string;
}

/**
 * Interface representing AWS connection options
 */
export interface AWSConnectionOptions {
  /**
   * The HTTP scheme to use when connecting to AWS.
   *
   * @type {HTTPScheme}
   */
  scheme?: HTTPScheme;

  /**
   * The AWS hostname to connect to.
   *
   * @type {string}
   */
  endpoint?: Endpoint | string;
}

/** Class representing an invalid AWS configuration */
export class InvalidAWSConfigError extends Error {
  constructor(message: string) {
    super(message);
  }
}
