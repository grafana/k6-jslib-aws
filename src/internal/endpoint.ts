/**
 * Represents an AWS service endpoint, providing utilities for parsing and handling URL details.
 */
export class Endpoint {
  private _protocol: string;
  private _hostname: string;
  private _port?: number;

  // Default protocol, this can be globally changed as per application requirements
  private static readonly DEFAULT_PROTOCOL = "https"; // Set this as per AWS.config

  /**
    //  * Constructs a new Endpoint instance.
     *
     * @param {string} endpoint - The URL to construct an endpoint from. If the URL omits a protocol, the default protocol will be used.
     */
  constructor(endpoint: string) {
    const isDefaultProtocol = !endpoint.startsWith("http://") &&
      !endpoint.startsWith("https://");
    const completeUrl = isDefaultProtocol
      ? `${Endpoint.DEFAULT_PROTOCOL}://${endpoint}`
      : endpoint;

    const protocolMatch = completeUrl.match(/^https?:/);
    const hostAndPath = completeUrl.replace(/^https?:\/\//, "");
    const [hostnameWithPort] = hostAndPath.split("/");

    this._protocol = protocolMatch
      ? protocolMatch[0].slice(0, -1)
      : Endpoint.DEFAULT_PROTOCOL;
    this._hostname = hostnameWithPort.split(":")[0];
    this._port = hostnameWithPort.split(":")[1]
      ? parseInt(hostnameWithPort.split(":")[1])
      : undefined;
  }

  /**
   * Creates a new Endpoint instance that is a copy of the current one.
   *
   * @returns {Endpoint} The copied Endpoint.
   */
  public copy(): Endpoint {
    return new Endpoint(this.href);
  }

  /**
   * Gets the host portion of the endpoint including the port.
   *
   * @returns {string} The host portion of the endpoint including the port.
   */
  public get host(): string {
    return this._port ? `${this._hostname}:${this._port}` : this._hostname;
  }

  /**
   * Sets the host portion of the endpoint including the port.
   *
   * @param {string} value - The value to set for the host.
   */
  public set host(value: string) {
    const [hostname, port] = value.split(":");
    this._hostname = hostname;
    this._port = port ? parseInt(port) : undefined;
  }

  /**
   * Gets the host portion of the endpoint without the port.
   *
   * @returns {string} The host portion of the endpoint.
   */
  public get hostname(): string {
    return this._hostname;
  }

  /**
   * Sets the host portion of the endpoint without the port.
   *
   * @param {string} value - The value to set for the hostname.
   */
  public set hostname(value: string) {
    this._hostname = value;
  }

  /**
   * Gets the full URL of the endpoint.
   *
   * @returns {string} The full URL of the endpoint.
   */
  public get href(): string {
    return `${this.protocol}://${this.host}`;
  }

  /**
   * Sets the full URL of the endpoint.
   *
   * @param {string} value - The value to set for the full URL.
   */
  public set href(value: string) {
    const protocolMatch = value.match(/^https?:/);
    const withoutProtocol = value.replace(/^https?:\/\//, "");
    const [hostnameWithPort] = withoutProtocol.split("/");

    this._protocol = protocolMatch
      ? protocolMatch[0].slice(0, -1)
      : Endpoint.DEFAULT_PROTOCOL; // remove the trailing colon
    this._hostname = hostnameWithPort.split(":")[0];
    this._port = hostnameWithPort.split(":")[1]
      ? parseInt(hostnameWithPort.split(":")[1])
      : undefined;
  }

  /**
   * Gets the port of the endpoint.
   *
   * @returns {number|undefined} The port of the endpoint.
   */
  public get port(): number | undefined {
    return this._port;
  }

  /**
   * Sets the port of the endpoint.
   *
   * @param {number|undefined} value - The value to set for the port.
   */
  public set port(value: number | undefined) {
    this._port = value;
  }

  /**
   * Gets the protocol (http or https) of the endpoint URL.
   *
   * @returns {string} The protocol of the endpoint URL.
   */
  public get protocol(): string {
    return this._protocol;
  }

  /**
   * Sets the protocol (http or https) of the endpoint URL.
   *
   * @param {string} value - The value to set for the protocol.
   */
  public set protocol(value: string) {
    this._protocol = value;
  }
}
