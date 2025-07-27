/**
 * Converts a web ReadableStream to a Buffer with a low memory footprint.
 */
export async function lowFootprintReaderToBuffer(
    reader: import('stream/web').ReadableStreamDefaultReader,
    size: number,
): Promise<Buffer> {
    const buf = Buffer.allocUnsafe(size)

    for (let bytesRead = 0; bytesRead < size; ) {
        const { done, value } = await reader.read()

        if (done) {
            if (bytesRead !== size) throw new Error(`Expected ${size} bytes, got ${bytesRead}`)
            break
        }

        // buf.set() will throw RangeError if this goes out of bounds
        buf.set(value, bytesRead)
        bytesRead += value.length
    }

    return buf
}
