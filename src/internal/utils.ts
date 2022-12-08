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
