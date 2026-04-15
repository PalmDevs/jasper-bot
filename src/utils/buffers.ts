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
            if (bytesRead !== size) {
                // If the stream ended before we read the expected size,
                // we copy the buffer (to deallocate the bigger buffer) and return only the bytes we read.
                const finalBuf = Buffer.allocUnsafe(bytesRead)
                buf.copy(finalBuf, 0, 0, bytesRead)
                return finalBuf
            }
            break
        }

        // buf.set() will throw RangeError if this goes out of bounds
        buf.set(value, bytesRead)
        bytesRead += value.length
    }

    return buf
}
