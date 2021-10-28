import http from "k6/http";
import {createPresignedURL} from "./cores.js";

export function getSecret(region, keyname, params = {}) {
  var body = `{"SecretId": "${keyname}"}`
  var options = {};
  options.method = "POST";
  options.signSessionToken = true;
  options.doubleEscape = false;
  options.headers = {}
  if (typeof params !== "undefined" && typeof params.headers !== "undefined") {
    options.headers = params.headers;
  }
  options.headers["X-Amz-Target"] = "secretsmanager.GetSecretValue";
  options.headers["Content-Type"] = "application/x-amz-json-1.1";
  params.headers = options.headers
  var url = createPresignedURL(
    options.method,
    "secretsmanager." + region + ".amazonaws.com",
    "/",
    "secretsmanager",
    body,
    options
  );

  return http.request(options.method, url, body, params)
}
