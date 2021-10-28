import {getItem} from "./dynamodb.js";

export default function () {
	var key = "coolkey"
	var keyValue = "coolkeyvalue"
	var res = getItem("coolTable", key, keyValue, "eu-west-1")
	console.log(res.body);
}
