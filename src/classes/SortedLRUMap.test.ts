import { describe, expect, test } from 'bun:test'
import { SortedLRUMap } from './SortedLRUMap'

describe('SortedLRUMap', () => {
    test('constructor initializes with correct maxSize', () => {
        const map = new SortedLRUMap(5)
        expect(map.maxSize).toBe(5)
        expect(map.size).toBe(0)
    })

    test('constructor throws error for invalid maxSize', () => {
        expect(() => new SortedLRUMap(0)).toThrow('maxSize must be greater than 0')
        expect(() => new SortedLRUMap(-1)).toThrow('maxSize must be greater than 0')
    })

    test('set and get basic operations', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(10, 'ten')
        map.set(5, 'five')
        map.set(15, 'fifteen')

        expect(map.get(10)).toBe('ten')
        expect(map.get(5)).toBe('five')
        expect(map.get(15)).toBe('fifteen')
        expect(map.get(99)).toBeUndefined()
        expect(map.size).toBe(3)
    })

    test('set updates existing key value', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(10, 'ten')
        expect(map.get(10)).toBe('ten')
        expect(map.size).toBe(1)

        map.set(10, 'updated ten')
        expect(map.get(10)).toBe('updated ten')
        expect(map.size).toBe(1) // Size should not change
    })

    test('keys returns sorted keys', () => {
        const map = new SortedLRUMap<number>(5)

        map.set(10, 100)
        map.set(5, 50)
        map.set(15, 150)
        map.set(1, 10)
        map.set(20, 200)

        const keys = map.keys()
        expect(keys).toEqual([1, 5, 10, 15, 20])
    })

    test('values returns values in sorted key order', () => {
        const map = new SortedLRUMap<number>(5)

        map.set(10, 100)
        map.set(5, 50)
        map.set(15, 150)
        map.set(1, 10)
        map.set(20, 200)

        const values = [...map.values()]
        expect(values).toEqual([10, 50, 100, 150, 200])
    })

    test('entries returns key-value pairs in sorted key order', () => {
        const map = new SortedLRUMap<number>(5)

        map.set(10, 100)
        map.set(5, 50)
        map.set(15, 150)

        const entries = [...map.entries()]
        expect(entries).toEqual([
            [5, 50],
            [10, 100],
            [15, 150],
        ])
    })

    test('has checks key existence', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(10, 'ten')
        map.set(5, 'five')

        expect(map.has(10)).toBe(true)
        expect(map.has(5)).toBe(true)
        expect(map.has(99)).toBe(false)
    })

    test('delete removes key-value pairs', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(10, 'ten')
        map.set(5, 'five')
        map.set(15, 'fifteen')

        expect(map.delete(10)).toBe(true)
        expect(map.get(10)).toBeUndefined()
        expect(map.has(10)).toBe(false)
        expect(map.size).toBe(2)
        expect(map.keys()).toEqual([5, 15])

        expect(map.delete(99)).toBe(false) // Non-existent key
    })

    test('clear removes all entries', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(10, 'ten')
        map.set(5, 'five')
        map.set(15, 'fifteen')

        map.clear()

        expect(map.size).toBe(0)
        expect(map.keys()).toEqual([])
        expect([...map.values()]).toEqual([])
        expect([...map.entries()]).toEqual([])
        expect(map.get(10)).toBeUndefined()
    })

    test('getClosest returns closest key-value pair', () => {
        const map = new SortedLRUMap<number>(5)

        map.set(10, 100)
        map.set(5, 50)
        map.set(15, 150)
        map.set(1, 10)
        map.set(20, 200)

        // Test exact matches
        expect(map.getClosest(10)).toEqual({ key: 10, value: 100 })

        // Test closest matches
        expect(map.getClosest(7)).toEqual({ key: 5, value: 50 }) // 7 is closer to 5 than 10
        expect(map.getClosest(8)).toEqual({ key: 10, value: 100 }) // 8 is closer to 10 than 5
        expect(map.getClosest(12)).toEqual({ key: 10, value: 100 }) // 12 is closer to 10 than 15
        expect(map.getClosest(18)).toEqual({ key: 20, value: 200 }) // 18 is closer to 20 than 15
        expect(map.getClosest(0)).toEqual({ key: 1, value: 10 }) // 0 is closest to 1
        expect(map.getClosest(25)).toEqual({ key: 20, value: 200 }) // 25 is closest to 20
    })

    test('getClosest returns undefined for empty map', () => {
        const map = new SortedLRUMap<number>(5)
        expect(map.getClosest(10)).toBeUndefined()
    })

    test('getClosest handles tie-breaking consistently', () => {
        const map = new SortedLRUMap<number>(3)

        map.set(10, 100)
        map.set(20, 200)

        // 15 is exactly between 10 and 20, should return one of them consistently
        const result = map.getClosest(15)
        expect(result).toBeDefined()
        expect([10, 20]).toContain(result!.key)
    })

    test('LRU eviction works correctly', () => {
        const map = new SortedLRUMap<string>(3)

        map.set(1, 'one')
        map.set(2, 'two')
        map.set(3, 'three')
        expect(map.size).toBe(3)
        expect(map.keys()).toEqual([1, 2, 3])

        // Adding a new key should evict the LRU (key 1)
        map.set(4, 'four')
        expect(map.size).toBe(3)
        expect(map.keys()).toEqual([2, 3, 4])
        expect(map.has(1)).toBe(false)
        expect(map.get(1)).toBeUndefined()
    })

    test('LRU behavior with access', () => {
        const map = new SortedLRUMap<string>(3)

        map.set(1, 'one')
        map.set(2, 'two')
        map.set(3, 'three')

        // Access key 1 to make it recently used
        map.get(1)

        // Adding a new key should evict the LRU (key 2, since 1 was accessed)
        map.set(4, 'four')
        expect(map.size).toBe(3)
        expect(map.keys()).toEqual([1, 3, 4])
        expect(map.has(2)).toBe(false)
        expect(map.has(1)).toBe(true) // Key 1 should still be there
    })

    test('LRU behavior with getClosest', () => {
        const map = new SortedLRUMap<string>(3)

        map.set(1, 'one')
        map.set(2, 'two')
        map.set(3, 'three')

        // Access key 1 via getClosest to make it recently used
        map.getClosest(1)

        // Adding a new key should evict the LRU (key 2, since 1 was accessed)
        map.set(4, 'four')
        expect(map.size).toBe(3)
        expect(map.keys()).toEqual([1, 3, 4])
        expect(map.has(2)).toBe(false)
        expect(map.has(1)).toBe(true)
    })

    test('LRU behavior with set update', () => {
        const map = new SortedLRUMap<string>(3)

        map.set(1, 'one')
        map.set(2, 'two')
        map.set(3, 'three')

        // Update key 1 to make it recently used
        map.set(1, 'updated one')

        // Adding a new key should evict the LRU (key 2, since 1 was updated)
        map.set(4, 'four')
        expect(map.size).toBe(3)
        expect(map.keys()).toEqual([1, 3, 4])
        expect(map.has(2)).toBe(false)
        expect(map.get(1)).toBe('updated one')
    })

    test('maxSize setter works correctly', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(1, 'one')
        map.set(2, 'two')
        map.set(3, 'three')
        map.set(4, 'four')
        map.set(5, 'five')

        expect(map.size).toBe(5)

        // Reduce maxSize, should trigger eviction
        map.maxSize = 3
        expect(map.maxSize).toBe(3)
        expect(map.size).toBe(3)

        // The 2 least recently used keys should be evicted
        const remainingKeys = map.keys()
        expect(remainingKeys.length).toBe(3)
        expect(remainingKeys).toEqual(remainingKeys.sort((a, b) => a - b)) // Should still be sorted
    })

    test('maxSize setter throws error for invalid values', () => {
        const map = new SortedLRUMap<string>(5)

        expect(() => {
            map.maxSize = 0
        }).toThrow('maxSize must be greater than 0')
        expect(() => {
            map.maxSize = -1
        }).toThrow('maxSize must be greater than 0')
    })

    test('handles duplicate keys in sorted order', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(10, 'first ten')
        map.set(5, 'five')
        map.set(10, 'second ten') // Update existing key
        map.set(15, 'fifteen')

        expect(map.size).toBe(3)
        expect(map.keys()).toEqual([5, 10, 15])
        expect(map.get(10)).toBe('second ten')
    })

    test('handles negative keys', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(-5, 'negative five')
        map.set(0, 'zero')
        map.set(-10, 'negative ten')
        map.set(5, 'positive five')

        expect(map.keys()).toEqual([-10, -5, 0, 5])
        expect(map.getClosest(-1)).toEqual({ key: 0, value: 'zero' })
        expect(map.getClosest(-7)).toEqual({ key: -5, value: 'negative five' })
    })

    test('handles floating point keys', () => {
        const map = new SortedLRUMap<string>(5)

        map.set(1.5, 'one point five')
        map.set(2.7, 'two point seven')
        map.set(1.1, 'one point one')

        expect(map.keys()).toEqual([1.1, 1.5, 2.7])
        expect(map.getClosest(1.3)).toEqual({ key: 1.1, value: 'one point one' })
        expect(map.getClosest(2.1)).toEqual({ key: 1.5, value: 'one point five' })
    })

    test('large dataset performance', () => {
        const map = new SortedLRUMap<number>(1000)

        // Insert 1000 random keys
        const keys = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10000))

        for (let i = 0; i < keys.length; i++) {
            map.set(keys[i]!, i)
        }

        expect(map.size).toBe(new Set(keys).size) // Size should be number of unique keys

        // Verify keys are still sorted
        const sortedKeys = map.keys()
        const expectedSorted = [...new Set(keys)].sort((a, b) => a - b)
        expect(sortedKeys).toEqual(expectedSorted)

        // Test getClosest on random targets
        for (let i = 0; i < 100; i++) {
            const target = Math.floor(Math.random() * 10000)
            const result = map.getClosest(target)
            expect(result).toBeDefined()
            expect(typeof result!.key).toBe('number')
            expect(typeof result!.value).toBe('number')
        }
    })

    test('edge case: single element', () => {
        const map = new SortedLRUMap<string>(1)

        map.set(42, 'answer')
        expect(map.size).toBe(1)
        expect(map.keys()).toEqual([42])
        expect(map.getClosest(0)).toEqual({ key: 42, value: 'answer' })
        expect(map.getClosest(100)).toEqual({ key: 42, value: 'answer' })

        // Adding another should evict the first
        map.set(100, 'hundred')
        expect(map.size).toBe(1)
        expect(map.keys()).toEqual([100])
        expect(map.has(42)).toBe(false)
    })

    test('edge case: extreme values', () => {
        const map = new SortedLRUMap<string>(3)

        map.set(Number.MAX_SAFE_INTEGER, 'max')
        map.set(Number.MIN_SAFE_INTEGER, 'min')
        map.set(0, 'zero')

        expect(map.keys()).toEqual([Number.MIN_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER])
        expect(map.getClosest(1)).toEqual({ key: 0, value: 'zero' })
        expect(map.getClosest(-1)).toEqual({ key: 0, value: 'zero' })
    })
})
