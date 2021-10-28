import http from "k6/http";
import {signWithHeaders} from "./core.js"

export function getItem(table, key, value, region) {
	var body = `{
		"TableName": "${table}",
			"Key": {
				"${key}": { "S": "${value}" }
			}
	}`
	var options = {};
	options.method = "POST";
	options.headers = {}
	options.headers["X-Amz-Target"] = "DynamoDB_20120810.GetItem";
	options.headers["Content-Type"] = "application/x-amz-json-1.0";
	var obj = signWithHeaders(
		options.method,
		"dynamodb",
		region,
		options.headers["X-Amz-Target"],
		"/",
		body,
		"",
		options.headers,
	);

	return http.request(options.method, obj.url, body,{headers: obj.headers} )
}
