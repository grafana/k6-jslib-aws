/**
 *
 * @param value
 * @returns
 */
export function isArrayBuffer(value: any): value is ArrayBuffer {
    return (
        typeof ArrayBuffer === 'function' &&
        (value instanceof ArrayBuffer ||
            Object.prototype.toString.call(value) === '[object ArrayBuffer]')
    )
}

export function toFormUrlEncoded(form: any): string {
    return Object.keys(form).reduce((params, key) => {
        let value = form[key]
        if (value !== undefined && value !== null) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        }
        return params;
    }, [] as string[]).join('&')
}