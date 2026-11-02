import http from "k6/http";
import { SignatureV4 } from "../../dist/signature.js";

export async function fixtureRequest(config, service, request) {
  const signature = new SignatureV4({
    service,
    region: config.region,
    credentials: config,
    uriEscapePath: service !== "s3",
  });
  const signed = signature.sign({
    endpoint: config.endpoint,
    path: "/",
    ...request,
  });
  const response = await http.asyncRequest(
    signed.method,
    signed.url,
    signed.body,
    { headers: signed.headers, responseType: "text" },
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `${service} fixture request failed (${response.status}): ${response.body}`,
    );
  }
  return response;
}

export function fixtureJson(
  config,
  service,
  target,
  body,
  contentType = "application/x-amz-json-1.1",
) {
  return fixtureRequest(config, service, {
    method: "POST",
    headers: { "Content-Type": contentType, "X-Amz-Target": target },
    body: JSON.stringify(body),
  }).then((response) => response.json());
}

export async function assertSignatureVerification(config) {
  const signature = new SignatureV4({
    service: "s3",
    region: config.region,
    credentials: { ...config, secretAccessKey: "intentionally-wrong-secret" },
    uriEscapePath: false,
  });
  const signed = signature.sign({
    method: "GET",
    endpoint: config.endpoint,
    path: "/",
    headers: {},
  });
  const response = await http.asyncRequest("GET", signed.url, null, {
    headers: signed.headers,
    responseType: "text",
  });
  if (
    response.status !== 403 || !response.body.includes("SignatureDoesNotMatch")
  ) {
    throw new Error("fakecloud must reject an incorrectly signed S3 request");
  }
}
