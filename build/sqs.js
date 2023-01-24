(()=>{"use strict";var e={n:t=>{var r=t&&t.__esModule?()=>t.default:()=>t;return e.d(r,{a:r}),r},d:(t,r)=>{for(var n in r)e.o(r,n)&&!e.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:r[n]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},t={};function r(e){return r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r(e)}function n(e,t){if(t&&("object"===r(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e)}function o(e){var t="function"==typeof Map?new Map:void 0;return o=function(e){if(null===e||(r=e,-1===Function.toString.call(r).indexOf("[native code]")))return e;var r;if("function"!=typeof e)throw new TypeError("Super expression must either be null or a function");if(void 0!==t){if(t.has(e))return t.get(e);t.set(e,n)}function n(){return i(e,arguments,u(this).constructor)}return n.prototype=Object.create(e.prototype,{constructor:{value:n,enumerable:!1,writable:!0,configurable:!0}}),a(n,e)},o(e)}function i(e,t,r){return i=c()?Reflect.construct.bind():function(e,t,r){var n=[null];n.push.apply(n,t);var o=new(Function.bind.apply(e,n));return r&&a(o,r.prototype),o},i.apply(null,arguments)}function c(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}function a(e,t){return a=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},a(e,t)}function u(e){return u=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},u(e)}function s(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,p(n.key),n)}}function f(e,t,r){return t&&s(e.prototype,t),r&&s(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e}function l(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function y(e,t,r){return(t=p(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function p(e){var t=function(e,t){if("object"!==r(e)||null===e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var o=n.call(e,t||"default");if("object"!==r(o))return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"===r(t)?t:String(t)}e.r(t),e.d(t,{AWSConfig:()=>h,InvalidAWSConfigError:()=>b,InvalidSignatureError:()=>ye,SQSClient:()=>Ie});var h=f((function e(t){if(l(this,e),y(this,"region",void 0),y(this,"accessKeyId",void 0),y(this,"secretAccessKey",void 0),y(this,"sessionToken",void 0),y(this,"scheme","https"),y(this,"endpoint","amazonaws.com"),""===t.region)throw new b("invalid AWS region; reason: should be a non empty string");if(""===t.accessKeyId)throw new b("invalid AWS access key ID; reason: should be a non empty string");if(t.accessKeyId.length<16||t.accessKeyId.length>128)throw new b("invalid AWS access key ID; reason: size should be between 16 and 128 characters, got ".concat(t.accessKeyId.length));if(""===t.secretAccessKey)throw new b("invalid AWS secret access key; reason: should be a non empty string");if(t.secretAccessKey.length<16||t.secretAccessKey.length>128)throw new b("invalid AWS secret access key; reason: size should be between 16 and 128 characters, got ".concat(t.secretAccessKey.length));this.region=t.region,this.accessKeyId=t.accessKeyId,this.secretAccessKey=t.secretAccessKey,void 0!==t.sessionToken&&(this.sessionToken=t.sessionToken),void 0!==t.scheme&&(this.scheme=t.scheme),void 0!==t.endpoint&&(this.endpoint=t.endpoint)})),b=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&a(e,t)}(i,e);var t,r,o=(t=i,r=c(),function(){var e,o=u(t);if(r){var i=u(this).constructor;e=Reflect.construct(o,arguments,i)}else e=o.apply(this,arguments);return n(this,e)});function i(e){return l(this,i),o.call(this,e)}return f(i)}(o(Error));const d=require("k6/crypto");var v=e.n(d),m="X-Amz-Algorithm",g="X-Amz-Credential",w="X-Amz-Date",O="X-Amz-Expires",j="X-Amz-Signature",S="X-Amz-SignedHeaders",P="X-Amz-Security-Token",k="x-amz-content-sha256",C=w.toLowerCase(),A=j.toLowerCase(),_=("X-Amz-Target".toLowerCase(),P.toLowerCase()),T="authorization",E=[T,C,"date"],x="host",R={authorization:!0,"cache-control":!0,connection:!0,expect:!0,from:!0,"keep-alive":!0,"max-forwards":!0,pragma:!0,referer:!0,te:!0,trailer:!0,"transfer-encoding":!0,upgrade:!0,"user-agent":!0,"x-amzn-trace-id":!0},D="aws4_request",I="AWS4-HMAC-SHA256",q=604800,M="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",H="UNSIGNED-PAYLOAD";const K=require("k6/html");function L(e){return L="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},L(e)}function z(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,V(n.key),n)}}function N(e,t){if(t&&("object"===L(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return B(e)}function B(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function U(e){var t="function"==typeof Map?new Map:void 0;return U=function(e){if(null===e||(r=e,-1===Function.toString.call(r).indexOf("[native code]")))return e;var r;if("function"!=typeof e)throw new TypeError("Super expression must either be null or a function");if(void 0!==t){if(t.has(e))return t.get(e);t.set(e,n)}function n(){return Q(e,arguments,F(this).constructor)}return n.prototype=Object.create(e.prototype,{constructor:{value:n,enumerable:!1,writable:!0,configurable:!0}}),X(n,e)},U(e)}function Q(e,t,r){return Q=W()?Reflect.construct.bind():function(e,t,r){var n=[null];n.push.apply(n,t);var o=new(Function.bind.apply(e,n));return r&&X(o,r.prototype),o},Q.apply(null,arguments)}function W(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}function X(e,t){return X=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},X(e,t)}function F(e){return F=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},F(e)}function V(e){var t=function(e,t){if("object"!==L(e)||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!==L(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"===L(t)?t:String(t)}var J=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&X(e,t)}(a,e);var t,r,n,o,i,c=(t=a,r=W(),function(){var e,n=F(t);if(r){var o=F(this).constructor;e=Reflect.construct(n,arguments,o)}else e=n.apply(this,arguments);return N(this,e)});function a(e,t){var r,n,o,i;return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,a),r=c.call(this,e),n=B(r),i=void 0,(o=V(o="code"))in n?Object.defineProperty(n,o,{value:i,enumerable:!0,configurable:!0,writable:!0}):n[o]=i,r.name="AWSError",r.code=t,r}return n=a,i=[{key:"parseXML",value:function(e){var t=(0,K.parseHTML)(e);return new a(t.find("Message").text(),t.find("Code").text())}}],(o=null)&&z(n.prototype,o),i&&z(n,i),Object.defineProperty(n,"prototype",{writable:!1}),a}(U(Error));function Z(e){return Object.keys(e).reduce((function(t,r){var n=e[r];return null!=n&&t.push("".concat(encodeURIComponent(r),"=").concat(encodeURIComponent(n))),t}),[]).join("&")}function $(e){return $="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},$(e)}function G(e,t){return G=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},G(e,t)}function Y(e){var t=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}();return function(){var r,n=te(e);if(t){var o=te(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return ee(this,r)}}function ee(e,t){if(t&&("object"===$(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e)}function te(e){return te=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},te(e)}function re(e,t){var r="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!r){if(Array.isArray(e)||(r=function(e,t){if(!e)return;if("string"==typeof e)return ne(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);"Object"===r&&e.constructor&&(r=e.constructor.name);if("Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return ne(e,t)}(e))||t&&e&&"number"==typeof e.length){r&&(e=r);var n=0,o=function(){};return{s:o,n:function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}},e:function(e){throw e},f:o}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var i,c=!0,a=!1;return{s:function(){r=r.call(e)},n:function(){var e=r.next();return c=e.done,e},e:function(e){a=!0,i=e},f:function(){try{c||null==r.return||r.return()}finally{if(a)throw i}}}}function ne(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}function oe(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function ie(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?oe(Object(r),!0).forEach((function(t){se(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):oe(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function ce(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function ae(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,fe(n.key),n)}}function ue(e,t,r){return t&&ae(e.prototype,t),r&&ae(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e}function se(e,t,r){return(t=fe(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function fe(e){var t=function(e,t){if("object"!==$(e)||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!==$(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"===$(t)?t:String(t)}var le=function(){function e(t){var r=t.service,n=t.region,o=t.credentials,i=t.uriEscapePath,c=t.applyChecksum;ce(this,e),se(this,"service",void 0),se(this,"region",void 0),se(this,"credentials",void 0),se(this,"uriEscapePath",void 0),se(this,"applyChecksum",void 0),this.service=r,this.region=n,this.credentials=o,this.uriEscapePath="boolean"!=typeof i||i,this.applyChecksum="boolean"!=typeof c||c}return ue(e,[{key:"sign",value:function(e,t){var r=t.signingDate,n=void 0===r?new Date:r,o=t.signingService,i=t.signingRegion,c=t.unsignableHeaders,a=void 0===c?new Set:c,u=t.signableHeaders,s=void 0===u?new Set:u,f=he(n),l=f.longDate,y=f.shortDate,p=o||this.service,h=i||this.region,b="".concat(y,"/").concat(h,"/").concat(p,"/").concat(D);e.headers[x]=e.hostname;for(var d=0,m=Object.keys(e.headers);d<m.length;d++){var g=m[d];E.indexOf(g.toLowerCase())>-1&&delete e.headers[g]}e.headers[C]=l,this.credentials.sessionToken&&(e.headers[_]=this.credentials.sessionToken),ArrayBuffer.isView(e.body)&&(e.body=e.body.buffer),e.body||(e.body="");var w=M;this.applyChecksum&&(!function(e,t){e=e.toLowerCase();for(var r=0,n=Object.keys(t);r<n.length;r++)if(e===n[r].toLowerCase())return!0;return!1}(k,e.headers)?(w=v().sha256(e.body,"hex").toLowerCase(),e.headers[k]=w):e.headers[k]===H&&(w=H));var O=this.computeCanonicalHeaders(e,a,s),j=this.createCanonicalRequest(e,O,w),S=this.deriveSigningKey(this.credentials,p,h,y),P=this.calculateSignature(l,b,S,j);e.headers[T]="".concat(I," ")+"Credential=".concat(this.credentials.accessKeyId,"/").concat(b,", ")+"SignedHeaders=".concat(Object.keys(O).sort().join(";"),", ")+"Signature=".concat(P);var A="".concat(e.protocol,"://").concat(e.hostname);return e.path&&(A+=e.path),e.query&&(A+="?".concat(this.serializeQueryParameters(e.query))),ie({url:A},e)}},{key:"presign",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=t.signingDate,n=void 0===r?new Date:r,o=t.expiresIn,i=void 0===o?3600:o,c=t.unsignableHeaders,a=t.unhoistableHeaders,u=t.signableHeaders,s=t.signingRegion,f=t.signingService,l=he(n),y=l.longDate,p=l.shortDate,h=s||this.region,b=f||this.service;if(i>q)throw new ye("Signature version 4 presigned URLs can't be valid for more than 7 days");var d="".concat(p,"/").concat(h,"/").concat(b,"/").concat(D),v=this.moveHeadersToQuery(e,{unhoistableHeaders:a});v.headers[x]=e.hostname,this.credentials.sessionToken&&(v.query[P]=this.credentials.sessionToken),v.query[m]=I,v.query[g]="".concat(this.credentials.accessKeyId,"/").concat(d),v.query[w]=y,v.query[O]=i.toString(10);var k=this.computeCanonicalHeaders(v,c,u);v.query[S]=Object.keys(k).sort().join(";");var C=this.deriveSigningKey(this.credentials,b,h,p),A=this.computePayloadHash(e),_=this.createCanonicalRequest(v,k,A);v.query[j]=this.calculateSignature(y,d,C,_);var T="".concat(v.protocol,"://").concat(v.hostname);return v.path&&(T+=v.path),v.query&&(T+="?".concat(this.serializeQueryParameters(v.query))),ie({url:T},v)}},{key:"createCanonicalRequest",value:function(e,t,r){var n=Object.keys(t).sort(),o=n.map((function(e){return"".concat(e,":").concat(t[e])})).join("\n"),i=n.join(";");return"".concat(e.method,"\n")+"".concat(this.computeCanonicalURI(e),"\n")+"".concat(this.computeCanonicalQuerystring(e),"\n")+"".concat(o,"\n\n")+"".concat(i,"\n")+"".concat(r)}},{key:"createStringToSign",value:function(e,t,r){var n=v().sha256(r,"hex");return"".concat(I,"\n")+"".concat(e,"\n")+"".concat(t,"\n")+"".concat(n)}},{key:"calculateSignature",value:function(e,t,r,n){var o=this.createStringToSign(e,t,n);return v().hmac("sha256",r,o,"hex")}},{key:"deriveSigningKey",value:function(e,t,r,n){var o=e.secretAccessKey,i=v().hmac("sha256","AWS4"+o,n,"binary"),c=v().hmac("sha256",i,r,"binary"),a=v().hmac("sha256",c,t,"binary");return v().hmac("sha256",a,"aws4_request","binary")}},{key:"computeCanonicalURI",value:function(e){var t=e.path;if(!this.uriEscapePath)return t;var r,n=[],o=re(t.split("/"));try{for(o.s();!(r=o.n()).done;){var i=r.value;0!=(null==i?void 0:i.length)&&("."!==i&&(".."===i?n.pop():n.push(i)))}}catch(e){o.e(e)}finally{o.f()}var c=null!=t&&t.startsWith("/")?"/":"",a=n.join("/"),u=n.length>0&&null!=t&&t.endsWith("/")?"/":"",s="".concat(c).concat(a).concat(u);return encodeURIComponent(s).replace(/%2F/g,"/")}},{key:"computeCanonicalQuerystring",value:function(e){var t,r=e.query,n=void 0===r?{}:r,o=[],i={},c=function(e){if(e.toLowerCase()===A)return"continue";o.push(e);var t=n[e];"string"==typeof t?i[e]="".concat(pe(e),"=").concat(pe(t)):Array.isArray(t)&&(i[e]=t.slice(0).sort().reduce((function(t,r){return t.concat(["".concat(pe(e),"=").concat(pe(r))])}),[]).join("&"))},a=re(Object.keys(n).sort());try{for(a.s();!(t=a.n()).done;)c(t.value)}catch(e){a.e(e)}finally{a.f()}return o.map((function(e){return i[e]})).filter((function(e){return e})).join("&")}},{key:"computeCanonicalHeaders",value:function(e,t,r){var n,o=e.headers,i={},c=re(Object.keys(o).sort());try{for(c.s();!(n=c.n()).done;){var a=n.value;if(null!=o[a]){var u=a.toLowerCase();(u in R||null!=t&&t.has(u))&&(!r||r&&!r.has(u))||(i[u]=o[a].trim().replace(/\s+/g," "))}}}catch(e){c.e(e)}finally{c.f()}return i}},{key:"computePayloadHash",value:function(e){for(var t,r=e.headers,n=e.body,o=0,i=Object.keys(r);o<i.length;o++){var c=i[o];if(c.toLowerCase()===k)return r[c]}return null==n?M:"string"==typeof n||(t=n,"function"==typeof ArrayBuffer&&(t instanceof ArrayBuffer||"[object ArrayBuffer]"===Object.prototype.toString.call(t)))?v().sha256(n,"hex").toLowerCase():ArrayBuffer.isView(n)?v().sha256(n.buffer,"hex").toLowerCase():H}},{key:"moveHeadersToQuery",value:function(e){for(var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=JSON.parse(JSON.stringify(e)),n=r.headers,o=r.query,i=void 0===o?{}:o,c=0,a=Object.keys(n);c<a.length;c++){var u,s=a[c],f=s.toLowerCase();"x-amz-"!==f.slice(0,6)||null!==(u=t.unhoistableHeaders)&&void 0!==u&&u.has(f)||(i[s]=n[s],delete n[s])}return ie(ie({},r),{},{headers:n,query:i})}},{key:"serializeQueryParameters",value:function(e,t){var r,n=[],o={},i=function(r){if(null!=t&&t.includes(r.toLowerCase()))return"continue";n.push(r);var i=e[r];"string"==typeof i?o[r]="".concat(pe(r),"=").concat(pe(i)):Array.isArray(i)&&(o[r]=i.slice(0).sort().reduce((function(e,t){return e.concat(["".concat(pe(r),"=").concat(pe(t))])}),[]).join("&"))},c=re(Object.keys(e).sort());try{for(c.s();!(r=c.n()).done;)i(r.value)}catch(e){c.e(e)}finally{c.f()}return n.map((function(e){return o[e]})).filter((function(e){return e})).join("&")}}]),e}(),ye=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&G(e,t)}(r,e);var t=Y(r);function r(e,n){var o;return ce(this,r),(o=t.call(this,e,n)).name="InvalidSignatureError",o}return ue(r)}(J);function pe(e){return encodeURIComponent(e).replace(/[!'()*]/g,(function(e){return"%".concat(e.charCodeAt(0).toString(16).toUpperCase())}))}function he(e){var t,r=(t=e,function(e){return"number"==typeof e?new Date(1e3*e):"string"==typeof e?Number(e)?new Date(1e3*Number(e)):new Date(e):e}(t).toISOString().replace(/\.\d{3}Z$/,"Z")).replace(/[\-:]/g,"");return{longDate:r,shortDate:r.slice(0,8)}}function be(e){return be="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},be(e)}function de(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,me(n.key),n)}}function ve(e,t,r){return(t=me(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function me(e){var t=function(e,t){if("object"!==be(e)||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!==be(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"===be(t)?t:String(t)}var ge=function(){function e(t,r){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),ve(this,"awsConfig",void 0),ve(this,"serviceName",void 0),ve(this,"_host",void 0),this.awsConfig=t,this.serviceName=r}var t,r,n;return t=e,(r=[{key:"host",get:function(){return null==this._host?"".concat(this.serviceName,".").concat(this.awsConfig.region,".").concat(this.awsConfig.endpoint):this._host},set:function(e){this._host=e}}])&&de(t.prototype,r),n&&de(t,n),Object.defineProperty(t,"prototype",{writable:!1}),e}();const we=require("k6/http");var Oe=e.n(we);function je(e){return je="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},je(e)}function Se(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function Pe(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?Se(Object(r),!0).forEach((function(t){xe(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):Se(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function ke(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,Re(n.key),n)}}function Ce(e,t){return Ce=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},Ce(e,t)}function Ae(e){var t=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}();return function(){var r,n=Ee(e);if(t){var o=Ee(this).constructor;r=Reflect.construct(n,arguments,o)}else r=n.apply(this,arguments);return _e(this,r)}}function _e(e,t){if(t&&("object"===je(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return Te(e)}function Te(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function Ee(e){return Ee=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},Ee(e)}function xe(e,t,r){return(t=Re(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function Re(e){var t=function(e,t){if("object"!==je(e)||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!==je(n))return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"===je(t)?t:String(t)}var De="2012-11-05",Ie=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&Ce(e,t)}(i,e);var t,r,n,o=Ae(i);function i(e){var t;return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,i),xe(Te(t=o.call(this,e,"sqs")),"signature",void 0),xe(Te(t),"commonHeaders",void 0),t.signature=new le({service:t.serviceName,region:t.awsConfig.region,credentials:{accessKeyId:t.awsConfig.accessKeyId,secretAccessKey:t.awsConfig.secretAccessKey,sessionToken:t.awsConfig.sessionToken},uriEscapePath:!1,applyChecksum:!0}),t.commonHeaders={"Content-Type":"application/x-www-form-urlencoded"},t}return t=i,r=[{key:"sendMessage",value:function(e){var t=this.signature.sign({method:"POST",protocol:"https",hostname:this.host,path:"/",headers:Pe({},this.commonHeaders),body:Z({Action:"SendMessage",Version:De,QueueUrl:e.queueUrl,MessageBody:e.messageBody})},{}),r=Oe().request("POST",t.url,t.body||"",{headers:t.headers});this._handleError(r);var n=r.html("SendMessageResponse > SendMessageResult");return{messageId:n.find("MessageId").text(),md5OfMessageBody:n.find("MD5OfMessageBody").text()}}},{key:"listQueues",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t="POST",r=this.signature.sign({method:"POST",protocol:"https",hostname:this.host,path:"/",headers:Pe(Pe({},this.commonHeaders),{},{Host:this.host}),body:Z({Action:"ListQueues",Version:De,MaxResults:e.maxResults,NextToken:e.nextToken,QueueNamePrefix:e.queueNamePrefix})},{}),n=Oe().request(t,r.url,r.body||"",{headers:r.headers});this._handleError(n);var o=n.html();return{queueUrls:o.find("QueueUrl").toArray().map((function(e){return e.text()})),nextToken:o.find("NextToken").text()||void 0}}},{key:"_handleError",value:function(e){var t=e.error_code;if(""!=e.error||0!==t)throw J.parseXML(e.body)}}],r&&ke(t.prototype,r),n&&ke(t,n),Object.defineProperty(t,"prototype",{writable:!1}),i}(ge),qe=exports;for(var Me in t)qe[Me]=t[Me];t.__esModule&&Object.defineProperty(qe,"__esModule",{value:!0})})();
//# sourceMappingURL=sqs.js.map