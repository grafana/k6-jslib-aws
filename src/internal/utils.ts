/**
 * @param value
 * @returns
 */
export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return (
    typeof ArrayBuffer === "function" &&
    (value instanceof ArrayBuffer ||
      Object.prototype.toString.call(value) === "[object ArrayBuffer]")
  );
}

export function toFormUrlEncoded(
  form: Record<string, string | number | boolean>,
): string {
  return Object.keys(form)
    .reduce((params, key) => {
      const value = form[key];
      if (value !== undefined && value !== null) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
      return params;
    }, [] as string[])
    .join("&");
}
