/*! For license information please see ssm.js.LICENSE.txt */
(()=>{"use strict";var e={n:t=>{var r=t&&t.__esModule?()=>t.default:()=>t;return e.d(r,{a:r}),r},d:(t,r)=>{for(var n in r)e.o(r,n)&&!e.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:r[n]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},t={};function r(e){return r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r(e)}function n(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,i,a,c=[],u=!0,s=!1;try{if(i=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;u=!1}else for(;!(u=(n=i.call(r)).done)&&(c.push(n.value),c.length!==t);u=!0);}catch(e){s=!0,o=e}finally{try{if(!u&&null!=r.return&&(a=r.return(),Object(a)!==a))return}finally{if(s)throw o}}return c}}(e,t)||function(e,t){if(!e)return;if("string"==typeof e)return o(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);"Object"===r&&e.constructor&&(r=e.constructor.name);if("Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return o(e,t)}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function o(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}function i(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,c(n.key),n)}}function a(e,t,r){return(t=c(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function c(e){var t=function(e,t){if("object"!=r(e)||!e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var o=n.call(e,t||"default");if("object"!=r(o))return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==r(t)?t:t+""}e.r(t),e.d(t,{AWSConfig:()=>w,InvalidAWSConfigError:()=>O,InvalidSignatureError:()=>se,SystemsManagerClient:()=>Ie,SystemsManagerParameter:()=>De,SystemsManagerServiceError:()=>Ne});var u=function(){function e(t){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),a(this,"_protocol",void 0),a(this,"_hostname",void 0),a(this,"_port",void 0);var r=!t.startsWith("http://")&&!t.startsWith("https://")?"".concat(e.DEFAULT_PROTOCOL,"://").concat(t):t,o=r.match(/^https?:/),i=n(r.replace(/^https?:\/\//,"").split("/"),1)[0];this._protocol=o?o[0].slice(0,-1):e.DEFAULT_PROTOCOL,this._hostname=i.split(":")[0],this._port=i.split(":")[1]?parseInt(i.split(":")[1]):void 0}return t=e,(r=[{key:"copy",value:function(){return new e(this.href)}},{key:"host",get:function(){return this._port?"".concat(this._hostname,":").concat(this._port):this._hostname},set:function(e){var t=n(e.split(":"),2),r=t[0],o=t[1];this._hostname=r,this._port=o?parseInt(o):void 0}},{key:"hostname",get:function(){return this._hostname},set:function(e){this._hostname=e}},{key:"href",get:function(){return"".concat(this.protocol,"://").concat(this.host)},set:function(t){var r=t.match(/^https?:/),o=n(t.replace(/^https?:\/\//,"").split("/"),1)[0];this._protocol=r?r[0].slice(0,-1):e.DEFAULT_PROTOCOL,this._hostname=o.split(":")[0],this._port=o.split(":")[1]?parseInt(o.split(":")[1]):void 0}},{key:"port",get:function(){return this._port},set:function(e){this._port=e}},{key:"protocol",get:function(){return this._protocol},set:function(e){this._protocol=e}}])&&i(t.prototype,r),o&&i(t,o),Object.defineProperty(t,"prototype",{writable:!1}),t;var t,r,o}();function s(e){return s="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},s(e)}function f(e,t,r){return t=h(t),function(e,t){if(t&&("object"===s(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e)}(e,p()?Reflect.construct(t,r||[],h(e).constructor):t.apply(e,r))}function l(e){var t="function"==typeof Map?new Map:void 0;return l=function(e){if(null===e||!function(e){try{return-1!==Function.toString.call(e).indexOf("[native code]")}catch(t){return"function"==typeof e}}(e))return e;if("function"!=typeof e)throw new TypeError("Super expression must either be null or a function");if(void 0!==t){if(t.has(e))return t.get(e);t.set(e,r)}function r(){return function(e,t,r){if(p())return Reflect.construct.apply(null,arguments);var n=[null];n.push.apply(n,t);var o=new(e.bind.apply(e,n));return r&&y(o,r.prototype),o}(e,arguments,h(this).constructor)}return r.prototype=Object.create(e.prototype,{constructor:{value:r,enumerable:!1,writable:!0,configurable:!0}}),y(r,e)},l(e)}function p(){try{var e=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){})))}catch(e){}return(p=function(){return!!e})()}function y(e,t){return y=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},y(e,t)}function h(e){return h=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},h(e)}function d(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function v(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,g(n.key),n)}}function b(e,t,r){return t&&v(e.prototype,t),r&&v(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e}function m(e,t,r){return(t=g(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function g(e){var t=function(e,t){if("object"!=s(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=s(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==s(t)?t:t+""}a(u,"DEFAULT_PROTOCOL","https");var w=function(){function e(t){if(d(this,e),m(this,"region",void 0),m(this,"accessKeyId",void 0),m(this,"secretAccessKey",void 0),m(this,"sessionToken",void 0),m(this,"endpoint",void 0),!t.region||""===t.region)throw new O('invalid AWS region; reason: expected a valid AWS region name (e.g. "us-east-1"), got `'.concat(t.region,"`"));if(!t.accessKeyId||""===t.accessKeyId)throw new O("invalid AWS access key ID; reason: expected a non empty string, got `".concat(t.accessKeyId,"`"));if(t.accessKeyId.length<16||t.accessKeyId.length>128)throw new O("invalid AWS access key ID; reason: size should be between 16 and 128 characters, got ".concat(t.accessKeyId.length));if(!t.secretAccessKey||""===t.secretAccessKey)throw new O("invalid AWS secret access key; reason: expected a non empty string, got `".concat(t.secretAccessKey,"`"));this.region=t.region,this.accessKeyId=t.accessKeyId,this.secretAccessKey=t.secretAccessKey,void 0!==t.sessionToken&&(this.sessionToken=t.sessionToken),void 0!==t.endpoint&&("string"==typeof t.endpoint?this.endpoint=new u(t.endpoint):this.endpoint=t.endpoint)}return b(e,null,[{key:"fromEnvironment",value:function(t){return new e({region:__ENV.AWS_REGION,accessKeyId:__ENV.AWS_ACCESS_KEY_ID,secretAccessKey:__ENV.AWS_SECRET_ACCESS_KEY,sessionToken:__ENV.AWS_SESSION_TOKEN,endpoint:null==t?void 0:t.endpoint})}}])}(),O=function(e){function t(e){return d(this,t),f(this,t,[e])}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&y(e,t)}(t,e),b(t)}(l(Error));const S=require("k6/crypto");var j=e.n(S),_="X-Amz-Date",P="X-Amz-Signature",E="X-Amz-Security-Token",k="x-amz-content-sha256",A=_.toLowerCase(),T=P.toLowerCase(),C="X-Amz-Target".toLowerCase(),x=E.toLowerCase(),L="authorization",I=[L,A,"date"],D="host",N={authorization:!0,"cache-control":!0,connection:!0,expect:!0,from:!0,"keep-alive":!0,"max-forwards":!0,pragma:!0,referer:!0,te:!0,trailer:!0,"transfer-encoding":!0,upgrade:!0,"user-agent":!0,"x-amzn-trace-id":!0},R="aws4_request",K="AWS4-HMAC-SHA256";const M=require("k6/html");function H(e){return H="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},H(e)}function q(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,F(n.key),n)}}function z(e,t,r){return t=U(t),function(e,t){if(t&&("object"===H(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e)}(e,G()?Reflect.construct(t,r||[],U(e).constructor):t.apply(e,r))}function W(e){var t="function"==typeof Map?new Map:void 0;return W=function(e){if(null===e||!function(e){try{return-1!==Function.toString.call(e).indexOf("[native code]")}catch(t){return"function"==typeof e}}(e))return e;if("function"!=typeof e)throw new TypeError("Super expression must either be null or a function");if(void 0!==t){if(t.has(e))return t.get(e);t.set(e,r)}function r(){return function(e,t,r){if(G())return Reflect.construct.apply(null,arguments);var n=[null];n.push.apply(n,t);var o=new(e.bind.apply(e,n));return r&&B(o,r.prototype),o}(e,arguments,U(this).constructor)}return r.prototype=Object.create(e.prototype,{constructor:{value:r,enumerable:!1,writable:!0,configurable:!0}}),B(r,e)},W(e)}function G(){try{var e=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){})))}catch(e){}return(G=function(){return!!e})()}function B(e,t){return B=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},B(e,t)}function U(e){return U=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},U(e)}function F(e){var t=function(e,t){if("object"!=H(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=H(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==H(t)?t:t+""}var X=function(e){function t(e,r){var n,o,i,a;return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),n=z(this,t,[e]),o=n,a=void 0,(i=F(i="code"))in o?Object.defineProperty(o,i,{value:a,enumerable:!0,configurable:!0,writable:!0}):o[i]=a,n.name="AWSError",n.code=r,n}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&B(e,t)}(t,e),r=t,o=[{key:"parseXML",value:function(e){var r=(0,M.parseHTML)(e);return new t(r.find("Message").text(),r.find("Code").text())}},{key:"parse",value:function(e){if("application/json"===e.headers["Content-Type"]){var r=e.json()||{};return new t(r.Message||r.message||r.__type||"An error occurred on the server side",e.headers["X-Amzn-Errortype"]||r.__type)}return t.parseXML(e.body)}}],(n=null)&&q(r.prototype,n),o&&q(r,o),Object.defineProperty(r,"prototype",{writable:!1}),r;var r,n,o}(W(Error));function V(e){return V="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},V(e)}function Q(e,t,r){return t=Y(t),function(e,t){if(t&&("object"===V(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e)}(e,J()?Reflect.construct(t,r||[],Y(e).constructor):t.apply(e,r))}function J(){try{var e=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){})))}catch(e){}return(J=function(){return!!e})()}function Y(e){return Y=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},Y(e)}function $(e,t){return $=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},$(e,t)}function Z(e,t){var r="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!r){if(Array.isArray(e)||(r=function(e,t){if(!e)return;if("string"==typeof e)return ee(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);"Object"===r&&e.constructor&&(r=e.constructor.name);if("Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return ee(e,t)}(e))||t&&e&&"number"==typeof e.length){r&&(e=r);var n=0,o=function(){};return{s:o,n:function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}},e:function(e){throw e},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var i,a=!0,c=!1;return{s:function(){r=r.call(e)},n:function(){var e=r.next();return a=e.done,e},e:function(e){c=!0,i=e},f:function(){try{a||null==r.return||r.return()}finally{if(c)throw i}}}}function ee(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}function te(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function re(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?te(Object(r),!0).forEach((function(t){ae(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):te(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function ne(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function oe(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,ce(n.key),n)}}function ie(e,t,r){return t&&oe(e.prototype,t),r&&oe(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e}function ae(e,t,r){return(t=ce(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function ce(e){var t=function(e,t){if("object"!=V(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=V(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==V(t)?t:t+""}var ue=function(){return ie((function e(t){var r=t.service,n=t.region,o=t.credentials,i=t.uriEscapePath,a=t.applyChecksum;ne(this,e),ae(this,"service",void 0),ae(this,"region",void 0),ae(this,"credentials",void 0),ae(this,"uriEscapePath",void 0),ae(this,"applyChecksum",void 0),this.service=r,this.region=n,this.credentials=o,this.uriEscapePath="boolean"!=typeof i||i,this.applyChecksum="boolean"!=typeof a||a}),[{key:"sign",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=re(re({},{signingDate:new Date,unsignableHeaders:new Set,signableHeaders:new Set}),t),n=le(r.signingDate),o=n.longDate,i=n.shortDate,a=r.signingService||this.service,c=r.signingRegion||this.region,u="".concat(i,"/").concat(c,"/").concat(a,"/").concat(R);e.headers[D]||(e.headers[D]=e.endpoint.hostname);for(var s=0,f=Object.keys(e.headers);s<f.length;s++){var l=f[s];I.indexOf(l.toLowerCase())>-1&&delete e.headers[l]}e.headers[A]=o,this.credentials.sessionToken&&(e.headers[x]=this.credentials.sessionToken),ArrayBuffer.isView(e.body)&&(e.body=e.body.buffer),e.body||(e.body="");var p=this.computePayloadHash(e);!function(e,t){e=e.toLowerCase();for(var r=0,n=Object.keys(t);r<n.length;r++)if(e===n[r].toLowerCase())return!0;return!1}(k,e.headers)&&this.applyChecksum&&(e.headers[k]=p);var y=this.computeCanonicalHeaders(e,r.unsignableHeaders,r.signableHeaders),h=this.calculateSignature(o,u,this.deriveSigningKey(this.credentials,a,c,i),this.createCanonicalRequest(e,y,p));e.headers[L]="".concat(K," ")+"Credential=".concat(this.credentials.accessKeyId,"/").concat(u,", ")+"SignedHeaders=".concat(Object.keys(y).sort().join(";"),", ")+"Signature=".concat(h);var d=e.endpoint.href;return e.path&&(d+=e.path.startsWith("/")?"":"/",d+=e.path),e.query&&(d+="?".concat(this.serializeQueryParameters(e.query))),re({url:d},e)}},{key:"presign",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=t.signingDate,n=void 0===r?new Date:r,o=t.expiresIn,i=void 0===o?3600:o,a=t.unsignableHeaders,c=t.unhoistableHeaders,u=t.signableHeaders,s=t.signingRegion,f=t.signingService,l=le(n),p=l.longDate,y=l.shortDate,h=s||this.region,d=f||this.service;if(i>604800)throw new se("Signature version 4 presigned URLs can't be valid for more than 7 days");var v="".concat(y,"/").concat(h,"/").concat(d,"/").concat(R),b=this.moveHeadersToQuery(e,{unhoistableHeaders:c});b.headers[D]||(b.headers[D]=e.endpoint.hostname),this.credentials.sessionToken&&(b.query[E]=this.credentials.sessionToken),b.query["X-Amz-Algorithm"]=K,b.query["X-Amz-Credential"]="".concat(this.credentials.accessKeyId,"/").concat(v),b.query[_]=p,b.query["X-Amz-Expires"]=i.toString(10);var m=this.computeCanonicalHeaders(b,a,u);b.query["X-Amz-SignedHeaders"]=Object.keys(m).sort().join(";");var g=this.deriveSigningKey(this.credentials,d,h,y),w=this.computePayloadHash(e),O=this.createCanonicalRequest(b,m,w);b.query[P]=this.calculateSignature(p,v,g,O);var S=b.endpoint.href;return b.path&&(S+=b.path.startsWith("/")?"":"/",S+=b.path),b.query&&(S+="?".concat(this.serializeQueryParameters(b.query))),re({url:S},b)}},{key:"createCanonicalRequest",value:function(e,t,r){var n=Object.keys(t).sort(),o=n.map((function(e){return"".concat(e,":").concat(t[e])})).join("\n"),i=n.join(";");return"".concat(e.method,"\n")+"".concat(this.computeCanonicalURI(e),"\n")+"".concat(this.computeCanonicalQuerystring(e),"\n")+"".concat(o,"\n\n")+"".concat(i,"\n")+"".concat(r)}},{key:"createStringToSign",value:function(e,t,r){var n=j().sha256(r,"hex");return"".concat(K,"\n")+"".concat(e,"\n")+"".concat(t,"\n")+"".concat(n)}},{key:"calculateSignature",value:function(e,t,r,n){var o=this.createStringToSign(e,t,n);return j().hmac("sha256",r,o,"hex")}},{key:"deriveSigningKey",value:function(e,t,r,n){var o=e.secretAccessKey,i=j().hmac("sha256","AWS4"+o,n,"binary"),a=j().hmac("sha256",i,r,"binary"),c=j().hmac("sha256",a,t,"binary");return j().hmac("sha256",c,"aws4_request","binary")}},{key:"computeCanonicalURI",value:function(e){var t=e.path;if(this.uriEscapePath){var r,n=[],o=Z(t.split("/"));try{for(o.s();!(r=o.n()).done;){var i=r.value;0!==(null==i?void 0:i.length)&&("."!==i&&(".."===i?n.pop():n.push(i)))}}catch(e){o.e(e)}finally{o.f()}var a=null!=t&&t.startsWith("/")?"/":"",c=n.join("/"),u=n.length>0&&null!=t&&t.endsWith("/")?"/":"",s="".concat(a).concat(c).concat(u);return encodeURIComponent(s).replace(/%2F/g,"/")}return t}},{key:"computeCanonicalQuerystring",value:function(e){var t,r=e.query,n=void 0===r?{}:r,o=[],i={},a=function(e){if(e.toLowerCase()===T)return 1;o.push(e);var t=n[e];"string"==typeof t?i[e]="".concat(fe(e),"=").concat(fe(t)):Array.isArray(t)&&(i[e]=t.slice(0).sort().reduce((function(t,r){return t.concat(["".concat(fe(e),"=").concat(fe(r))])}),[]).join("&"))},c=Z(Object.keys(n).sort());try{for(c.s();!(t=c.n()).done;){a(t.value)}}catch(e){c.e(e)}finally{c.f()}return o.map((function(e){return i[e]})).filter((function(e){return e})).join("&")}},{key:"computeCanonicalHeaders",value:function(e,t,r){var n,o=e.headers,i={},a=Z(Object.keys(o).sort());try{for(a.s();!(n=a.n()).done;){var c=n.value;if(null!=o[c]){var u=c.toLowerCase();(u in N||null!=t&&t.has(u))&&(!r||r&&!r.has(u))||"string"==typeof o[c]&&(i[u]=o[c]=o[c].trim().replace(/\s+/g," "))}}}catch(e){a.e(e)}finally{a.f()}return i}},{key:"computePayloadHash",value:function(e){var t,r=e.headers,n=e.body;return r[k]?r[k]:null==n?"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855":"string"==typeof n||(t=n,"function"==typeof ArrayBuffer&&(t instanceof ArrayBuffer||"[object ArrayBuffer]"===Object.prototype.toString.call(t)))?j().sha256(n,"hex").toLowerCase():ArrayBuffer.isView(n)?j().sha256(n.buffer,"hex").toLowerCase():"UNSIGNED-PAYLOAD"}},{key:"moveHeadersToQuery",value:function(e){for(var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=JSON.parse(JSON.stringify(e)),n=r.headers,o=r.query,i=void 0===o?{}:o,a=0,c=Object.keys(n);a<c.length;a++){var u,s=c[a],f=s.toLowerCase();"x-amz-"!==f.slice(0,6)||null!==(u=t.unhoistableHeaders)&&void 0!==u&&u.has(f)||(i[s]=n[s],delete n[s])}return re(re({},r),{},{headers:n,query:i})}},{key:"serializeQueryParameters",value:function(e,t){var r,n=[],o={},i=function(r){if(null!=t&&t.includes(r.toLowerCase()))return 1;n.push(r);var i=e[r];"string"==typeof i?o[r]="".concat(fe(r),"=").concat(fe(i)):Array.isArray(i)&&(o[r]=i.slice(0).sort().reduce((function(e,t){return e.concat(["".concat(fe(r),"=").concat(fe(t))])}),[]).join("&"))},a=Z(Object.keys(e).sort());try{for(a.s();!(r=a.n()).done;){i(r.value)}}catch(e){a.e(e)}finally{a.f()}return n.map((function(e){return o[e]})).filter((function(e){return e})).join("&")}}])}(),se=function(e){function t(e,r){var n;return ne(this,t),(n=Q(this,t,[e,r])).name="InvalidSignatureError",n}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&$(e,t)}(t,e),ie(t)}(X);function fe(e){return encodeURIComponent(e).replace(/[!'()*]/g,(function(e){return"%".concat(e.charCodeAt(0).toString(16).toUpperCase())}))}function le(e){var t,r=(t=e,function(e){return"number"==typeof e?new Date(1e3*e):"string"==typeof e?Number(e)?new Date(1e3*Number(e)):new Date(e):e}(t).toISOString().replace(/\.\d{3}Z$/,"Z")).replace(/[-:]/g,"");return{longDate:r,shortDate:r.slice(0,8)}}const pe=require("k6/http");var ye=e.n(pe);function he(e){return he="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},he(e)}function de(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,be(n.key),n)}}function ve(e,t,r){return(t=be(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function be(e){var t=function(e,t){if("object"!=he(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=he(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==he(t)?t:t+""}function me(e){return me="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},me(e)}function ge(){ge=function(){return t};var e,t={},r=Object.prototype,n=r.hasOwnProperty,o=Object.defineProperty||function(e,t,r){e[t]=r.value},i="function"==typeof Symbol?Symbol:{},a=i.iterator||"@@iterator",c=i.asyncIterator||"@@asyncIterator",u=i.toStringTag||"@@toStringTag";function s(e,t,r){return Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}),e[t]}try{s({},"")}catch(e){s=function(e,t,r){return e[t]=r}}function f(e,t,r,n){var i=t&&t.prototype instanceof b?t:b,a=Object.create(i.prototype),c=new C(n||[]);return o(a,"_invoke",{value:E(e,r,c)}),a}function l(e,t,r){try{return{type:"normal",arg:e.call(t,r)}}catch(e){return{type:"throw",arg:e}}}t.wrap=f;var p="suspendedStart",y="suspendedYield",h="executing",d="completed",v={};function b(){}function m(){}function g(){}var w={};s(w,a,(function(){return this}));var O=Object.getPrototypeOf,S=O&&O(O(x([])));S&&S!==r&&n.call(S,a)&&(w=S);var j=g.prototype=b.prototype=Object.create(w);function _(e){["next","throw","return"].forEach((function(t){s(e,t,(function(e){return this._invoke(t,e)}))}))}function P(e,t){function r(o,i,a,c){var u=l(e[o],e,i);if("throw"!==u.type){var s=u.arg,f=s.value;return f&&"object"==me(f)&&n.call(f,"__await")?t.resolve(f.__await).then((function(e){r("next",e,a,c)}),(function(e){r("throw",e,a,c)})):t.resolve(f).then((function(e){s.value=e,a(s)}),(function(e){return r("throw",e,a,c)}))}c(u.arg)}var i;o(this,"_invoke",{value:function(e,n){function o(){return new t((function(t,o){r(e,n,t,o)}))}return i=i?i.then(o,o):o()}})}function E(t,r,n){var o=p;return function(i,a){if(o===h)throw Error("Generator is already running");if(o===d){if("throw"===i)throw a;return{value:e,done:!0}}for(n.method=i,n.arg=a;;){var c=n.delegate;if(c){var u=k(c,n);if(u){if(u===v)continue;return u}}if("next"===n.method)n.sent=n._sent=n.arg;else if("throw"===n.method){if(o===p)throw o=d,n.arg;n.dispatchException(n.arg)}else"return"===n.method&&n.abrupt("return",n.arg);o=h;var s=l(t,r,n);if("normal"===s.type){if(o=n.done?d:y,s.arg===v)continue;return{value:s.arg,done:n.done}}"throw"===s.type&&(o=d,n.method="throw",n.arg=s.arg)}}}function k(t,r){var n=r.method,o=t.iterator[n];if(o===e)return r.delegate=null,"throw"===n&&t.iterator.return&&(r.method="return",r.arg=e,k(t,r),"throw"===r.method)||"return"!==n&&(r.method="throw",r.arg=new TypeError("The iterator does not provide a '"+n+"' method")),v;var i=l(o,t.iterator,r.arg);if("throw"===i.type)return r.method="throw",r.arg=i.arg,r.delegate=null,v;var a=i.arg;return a?a.done?(r[t.resultName]=a.value,r.next=t.nextLoc,"return"!==r.method&&(r.method="next",r.arg=e),r.delegate=null,v):a:(r.method="throw",r.arg=new TypeError("iterator result is not an object"),r.delegate=null,v)}function A(e){var t={tryLoc:e[0]};1 in e&&(t.catchLoc=e[1]),2 in e&&(t.finallyLoc=e[2],t.afterLoc=e[3]),this.tryEntries.push(t)}function T(e){var t=e.completion||{};t.type="normal",delete t.arg,e.completion=t}function C(e){this.tryEntries=[{tryLoc:"root"}],e.forEach(A,this),this.reset(!0)}function x(t){if(t||""===t){var r=t[a];if(r)return r.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var o=-1,i=function r(){for(;++o<t.length;)if(n.call(t,o))return r.value=t[o],r.done=!1,r;return r.value=e,r.done=!0,r};return i.next=i}}throw new TypeError(me(t)+" is not iterable")}return m.prototype=g,o(j,"constructor",{value:g,configurable:!0}),o(g,"constructor",{value:m,configurable:!0}),m.displayName=s(g,u,"GeneratorFunction"),t.isGeneratorFunction=function(e){var t="function"==typeof e&&e.constructor;return!!t&&(t===m||"GeneratorFunction"===(t.displayName||t.name))},t.mark=function(e){return Object.setPrototypeOf?Object.setPrototypeOf(e,g):(e.__proto__=g,s(e,u,"GeneratorFunction")),e.prototype=Object.create(j),e},t.awrap=function(e){return{__await:e}},_(P.prototype),s(P.prototype,c,(function(){return this})),t.AsyncIterator=P,t.async=function(e,r,n,o,i){void 0===i&&(i=Promise);var a=new P(f(e,r,n,o),i);return t.isGeneratorFunction(r)?a:a.next().then((function(e){return e.done?e.value:a.next()}))},_(j),s(j,u,"Generator"),s(j,a,(function(){return this})),s(j,"toString",(function(){return"[object Generator]"})),t.keys=function(e){var t=Object(e),r=[];for(var n in t)r.push(n);return r.reverse(),function e(){for(;r.length;){var n=r.pop();if(n in t)return e.value=n,e.done=!1,e}return e.done=!0,e}},t.values=x,C.prototype={constructor:C,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=e,this.done=!1,this.delegate=null,this.method="next",this.arg=e,this.tryEntries.forEach(T),!t)for(var r in this)"t"===r.charAt(0)&&n.call(this,r)&&!isNaN(+r.slice(1))&&(this[r]=e)},stop:function(){this.done=!0;var e=this.tryEntries[0].completion;if("throw"===e.type)throw e.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var r=this;function o(n,o){return c.type="throw",c.arg=t,r.next=n,o&&(r.method="next",r.arg=e),!!o}for(var i=this.tryEntries.length-1;i>=0;--i){var a=this.tryEntries[i],c=a.completion;if("root"===a.tryLoc)return o("end");if(a.tryLoc<=this.prev){var u=n.call(a,"catchLoc"),s=n.call(a,"finallyLoc");if(u&&s){if(this.prev<a.catchLoc)return o(a.catchLoc,!0);if(this.prev<a.finallyLoc)return o(a.finallyLoc)}else if(u){if(this.prev<a.catchLoc)return o(a.catchLoc,!0)}else{if(!s)throw Error("try statement without catch or finally");if(this.prev<a.finallyLoc)return o(a.finallyLoc)}}}},abrupt:function(e,t){for(var r=this.tryEntries.length-1;r>=0;--r){var o=this.tryEntries[r];if(o.tryLoc<=this.prev&&n.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var i=o;break}}i&&("break"===e||"continue"===e)&&i.tryLoc<=t&&t<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=e,a.arg=t,i?(this.method="next",this.next=i.finallyLoc,v):this.complete(a)},complete:function(e,t){if("throw"===e.type)throw e.arg;return"break"===e.type||"continue"===e.type?this.next=e.arg:"return"===e.type?(this.rval=this.arg=e.arg,this.method="return",this.next="end"):"normal"===e.type&&t&&(this.next=t),v},finish:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.finallyLoc===e)return this.complete(r.completion,r.afterLoc),T(r),v}},catch:function(e){for(var t=this.tryEntries.length-1;t>=0;--t){var r=this.tryEntries[t];if(r.tryLoc===e){var n=r.completion;if("throw"===n.type){var o=n.arg;T(r)}return o}}throw Error("illegal catch attempt")},delegateYield:function(t,r,n){return this.delegate={iterator:x(t),resultName:r,nextLoc:n},"next"===this.method&&(this.arg=e),v}},t}function we(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function Oe(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?we(Object(r),!0).forEach((function(t){xe(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):we(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function Se(e,t,r,n,o,i,a){try{var c=e[i](a),u=c.value}catch(e){return void r(e)}c.done?t(u):Promise.resolve(u).then(n,o)}function je(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function _e(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,Le(n.key),n)}}function Pe(e,t,r){return t&&_e(e.prototype,t),r&&_e(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e}function Ee(e,t,r){return t=Ae(t),function(e,t){if(t&&("object"===me(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e)}(e,ke()?Reflect.construct(t,r||[],Ae(e).constructor):t.apply(e,r))}function ke(){try{var e=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){})))}catch(e){}return(ke=function(){return!!e})()}function Ae(e){return Ae=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},Ae(e)}function Te(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&Ce(e,t)}function Ce(e,t){return Ce=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},Ce(e,t)}function xe(e,t,r){return(t=Le(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function Le(e){var t=function(e,t){if("object"!=me(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=me(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==me(t)?t:t+""}var Ie=function(e){function t(e){var r;return je(this,t),xe(r=Ee(this,t,[e,"ssm"]),"signature",void 0),xe(r,"method",void 0),xe(r,"commonHeaders",void 0),r.method="POST",r.commonHeaders={"Content-Type":"application/x-amz-json-1.1"},r.signature=new ue({service:r.serviceName,region:e.region,credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey,sessionToken:e.sessionToken},uriEscapePath:!0,applyChecksum:!1}),r}return Te(t,e),Pe(t,[{key:"getParameter",value:(r=ge().mark((function e(t){var r,n,o,i=arguments;return ge().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return r=i.length>1&&void 0!==i[1]&&i[1],n=this.signature.sign({method:this.method,endpoint:this.endpoint,path:"/",headers:Oe(Oe({},this.commonHeaders),{},xe({},C,"AmazonSSM.GetParameter")),body:JSON.stringify({Name:t,WithDecryption:r})},{}),e.next=4,ye().asyncRequest(this.method,n.url,n.body,{headers:n.headers});case 4:return o=e.sent,this._handle_error(Re.GetParameter,o),e.abrupt("return",De.fromJSON(o.json()));case 7:case"end":return e.stop()}}),e,this)})),n=function(){var e=this,t=arguments;return new Promise((function(n,o){var i=r.apply(e,t);function a(e){Se(i,n,o,a,c,"next",e)}function c(e){Se(i,n,o,a,c,"throw",e)}a(void 0)}))},function(e){return n.apply(this,arguments)})},{key:"_handle_error",value:function(e,t){var r=t.error_code;if(0!==r){var n=t.json();if(r>=1400&&r<=1499){var o=n.Message||n.message||n.__type;if("InvalidSignatureException"===n.__type)throw new se(o,n.__type);throw new Ne(o,n.__type,e)}if(1500===r)throw new Ne("An error occured on the server side","InternalServiceError",e)}}}]);var r,n}(function(){return e=function e(t,r){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),ve(this,"awsConfig",void 0),ve(this,"serviceName",void 0),ve(this,"_endpoint",void 0),this.awsConfig=t,this.serviceName=r,null!=t.endpoint&&(this._endpoint=t.endpoint)},(t=[{key:"endpoint",get:function(){return null==this._endpoint&&(this._endpoint=new u("https://".concat(this.serviceName,".").concat(this.awsConfig.region,".amazonaws.com"))),this._endpoint},set:function(e){this._endpoint=e}}])&&de(e.prototype,t),r&&de(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e;var e,t,r}()),De=function(){function e(t,r,n,o,i,a,c,u,s){je(this,e),xe(this,"arn",void 0),xe(this,"dataType",void 0),xe(this,"lastModifiedDate",void 0),xe(this,"name",void 0),xe(this,"selector",void 0),xe(this,"sourceResult",void 0),xe(this,"type",void 0),xe(this,"value",void 0),xe(this,"version",void 0),this.arn=t,this.dataType=r,this.lastModifiedDate=n,this.name=o,this.selector=i,this.sourceResult=a,this.type=c,this.value=u,this.version=s}return Pe(e,null,[{key:"fromJSON",value:function(t){var r=t.Parameter;return new e(r.ARN,r.DataType,r.LastModifiedDate,r.Name,r.Selector,r.SourceResult,r.Type,r.Value,r.Version)}}])}(),Ne=function(e){function t(e,r,n){var o;return je(this,t),xe(o=Ee(this,t,[e,r]),"operation",void 0),o.name="SystemsManagerServiceError",o.operation=n,o}return Te(t,e),Pe(t)}(X),Re=function(e){return e.GetParameter="GetParameter",e}(Re||{}),Ke=exports;for(var Me in t)Ke[Me]=t[Me];t.__esModule&&Object.defineProperty(Ke,"__esModule",{value:!0})})();
//# sourceMappingURL=ssm.js.map