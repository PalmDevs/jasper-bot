import { describe, expect, test } from 'bun:test'
import { lowFootprintReaderToBuffer } from './buffers'

// Helper function to create a mock ReadableStreamDefaultReader
function createMockReader(chunks: Uint8Array[]): ReadableStreamDefaultReader {
    let index = 0
    return {
        read: async () => {
            if (index >= chunks.length) {
                return { done: true, value: undefined }
            }
            const value = chunks[index++]
            return { done: false, value }
        },
        releaseLock: () => {},
        cancel: async () => {},
        closed: Promise.resolve(undefined),
    } as ReadableStreamDefaultReader
}

// Helper to create chunks of specific sizes
function createChunk(size: number, fillByte = 0x42): Uint8Array {
    return new Uint8Array(size).fill(fillByte)
}

describe('lowFootprintReaderToBuffer', () => {
    test('handles single chunk that matches expected size', async () => {
        const expectedSize = 10
        const chunk = createChunk(expectedSize, 0x41)
        const reader = createMockReader([chunk])

        const result = await lowFootprintReaderToBuffer(reader, expectedSize)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(expectedSize)
        expect(result.every(byte => byte === 0x41)).toBe(true)
    })

    test('handles multiple chunks that sum to expected size', async () => {
        const chunk1 = createChunk(5, 0x11)
        const chunk2 = createChunk(3, 0x22)
        const chunk3 = createChunk(2, 0x33)
        const expectedSize = 10
        const reader = createMockReader([chunk1, chunk2, chunk3])

        const result = await lowFootprintReaderToBuffer(reader, expectedSize)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(expectedSize)
        // Verify the chunks are in the right order
        expect(result.subarray(0, 5).every(byte => byte === 0x11)).toBe(true)
        expect(result.subarray(5, 8).every(byte => byte === 0x22)).toBe(true)
        expect(result.subarray(8, 10).every(byte => byte === 0x33)).toBe(true)
    })

    test('handles empty stream (size 0)', async () => {
        const reader = createMockReader([])

        const result = await lowFootprintReaderToBuffer(reader, 0)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(0)
    })

    test('handles single byte', async () => {
        const chunk = createChunk(1, 0xff)
        const reader = createMockReader([chunk])

        const result = await lowFootprintReaderToBuffer(reader, 1)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(1)
        expect(result[0]).toBe(0xff)
    })

    test('handles large buffer (memory safety test)', async () => {
        // Test with 1MB of data in 1KB chunks
        const chunkSize = 1024
        const totalSize = 1024 * 1024 // 1MB
        const numChunks = totalSize / chunkSize

        const chunks: Uint8Array[] = []
        for (let i = 0; i < numChunks; i++) {
            chunks.push(createChunk(chunkSize, i % 256))
        }

        const reader = createMockReader(chunks)

        const result = await lowFootprintReaderToBuffer(reader, totalSize)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(totalSize)

        // Verify some data integrity
        for (let i = 0; i < numChunks; i++) {
            const chunkStart = i * chunkSize
            const chunkEnd = chunkStart + chunkSize
            const expectedByte = i % 256
            expect(result.subarray(chunkStart, chunkEnd).every(byte => byte === expectedByte)).toBe(true)
        }
    })

    test('throws error when stream ends before expected size', async () => {
        const chunk = createChunk(5)
        const reader = createMockReader([chunk]) // Only 5 bytes, but expecting 10

        await expect(lowFootprintReaderToBuffer(reader, 10)).rejects.toThrow('Expected 10 bytes, got 5')
    })

    test('throws error when no data provided but size expected', async () => {
        const reader = createMockReader([]) // No chunks

        await expect(lowFootprintReaderToBuffer(reader, 5)).rejects.toThrow('Expected 5 bytes, got 0')
    })

    test('handles irregular chunk sizes', async () => {
        const chunks = [
            createChunk(1, 0x01),
            createChunk(7, 0x02),
            createChunk(2, 0x03),
            createChunk(15, 0x04),
            createChunk(3, 0x05),
        ]
        const expectedSize = 28
        const reader = createMockReader(chunks)

        const result = await lowFootprintReaderToBuffer(reader, expectedSize)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(expectedSize)

        // Verify chunk boundaries
        expect(result.subarray(0, 1).every(byte => byte === 0x01)).toBe(true)
        expect(result.subarray(1, 8).every(byte => byte === 0x02)).toBe(true)
        expect(result.subarray(8, 10).every(byte => byte === 0x03)).toBe(true)
        expect(result.subarray(10, 25).every(byte => byte === 0x04)).toBe(true)
        expect(result.subarray(25, 28).every(byte => byte === 0x05)).toBe(true)
    })

    test('memory allocation uses exact size (no over-allocation)', async () => {
        const expectedSize = 100
        const chunks = [createChunk(expectedSize)]
        const reader = createMockReader(chunks)

        const result = await lowFootprintReaderToBuffer(reader, expectedSize)

        // Buffer should be exactly the requested size, no more
        expect(result.length).toBe(expectedSize)
        expect(result.byteLength).toBe(expectedSize)
    })

    test('handles edge case with many small chunks', async () => {
        // Create 1000 chunks of 1 byte each
        const numChunks = 1000
        const chunks: Uint8Array[] = []
        for (let i = 0; i < numChunks; i++) {
            chunks.push(createChunk(1, i % 256))
        }

        const reader = createMockReader(chunks)

        const result = await lowFootprintReaderToBuffer(reader, numChunks)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(numChunks)

        // Verify each byte matches expected value
        for (let i = 0; i < numChunks; i++) {
            expect(result[i]).toBe(i % 256)
        }
    })

    test('preserves binary data integrity', async () => {
        // Test with various byte values including edge cases
        const testBytes = [0x00, 0x01, 0x7f, 0x80, 0xff, 0xaa, 0x55]
        const chunks = testBytes.map(byte => new Uint8Array([byte]))
        const reader = createMockReader(chunks)

        const result = await lowFootprintReaderToBuffer(reader, testBytes.length)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(testBytes.length)

        for (let i = 0; i < testBytes.length; i++) {
            expect(result[i]).toBe(testBytes[i]!)
        }
    })

    test('throws RangeError when chunk would exceed buffer bounds', async () => {
        // This tests the buf.set() RangeError protection mentioned in the code
        // Create a chunk that would overflow when we try to set it at the wrong position
        const oversizedChunk = createChunk(15) // Bigger than expected total size
        const reader = createMockReader([oversizedChunk])

        // This should throw a RangeError from buf.set() before our size check
        await expect(lowFootprintReaderToBuffer(reader, 10)).rejects.toThrow(RangeError)
    })

    test('handles exact boundary conditions', async () => {
        // Test where the last chunk perfectly fills the remaining space
        const chunk1 = createChunk(7, 0x11)
        const chunk2 = createChunk(3, 0x22) // Exactly fills remaining 3 bytes
        const expectedSize = 10
        const reader = createMockReader([chunk1, chunk2])

        const result = await lowFootprintReaderToBuffer(reader, expectedSize)

        expect(result).toBeInstanceOf(Buffer)
        expect(result.length).toBe(expectedSize)
        expect(result.subarray(0, 7).every(byte => byte === 0x11)).toBe(true)
        expect(result.subarray(7, 10).every(byte => byte === 0x22)).toBe(true)
    })
})
