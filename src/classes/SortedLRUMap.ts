/**
 * A node in the sorted LRU linked list
 */
class SortedLRUNode<T = any> {
    key: number
    value: T
    prev: SortedLRUNode | null = null
    next: SortedLRUNode | null = null

    constructor(key: number, value: T) {
        this.key = key
        this.value = value
    }
}

/**
 * A node in the sorted keys linked list
 */
class SortedKeyNode {
    key: number
    prev: SortedKeyNode | null = null
    next: SortedKeyNode | null = null

    constructor(key: number) {
        this.key = key
    }
}

/**
 * A Map-like data structure that maintains keys in sorted order and implements LRU cache behavior.
 * Optimized for finding the closest key efficiently using binary search.
 */
export class SortedLRUMap<T = any> {
    // @ts-expect-error: Set in constructor via setter
    #maxSize: number
    #size = 0
    #head: SortedLRUNode<T> = new SortedLRUNode(Number.NEGATIVE_INFINITY, undefined!)
    #tail: SortedLRUNode<T> = new SortedLRUNode(Number.POSITIVE_INFINITY, undefined!)
    #keyToNode: Map<number, SortedLRUNode<T>> = new Map()
    #sortedKeysHead: SortedKeyNode = new SortedKeyNode(Number.NEGATIVE_INFINITY)
    #sortedKeysTail: SortedKeyNode = new SortedKeyNode(Number.POSITIVE_INFINITY)
    #keyToSortedNode: Map<number, SortedKeyNode> = new Map()

    constructor(maxSize: number) {
        this.maxSize = maxSize

        // Initialize dummy head and tail nodes for LRU list
        this.#head.next = this.#tail
        this.#tail.prev = this.#head

        // Initialize dummy head and tail nodes for sorted keys list
        this.#sortedKeysHead.next = this.#sortedKeysTail
        this.#sortedKeysTail.prev = this.#sortedKeysHead
    }

    set maxSize(value: number) {
        if (value <= 0) throw new Error('maxSize must be greater than 0')
        this.#maxSize = value
        while (this.#size > this.#maxSize) this.#evictLRU()
    }

    get maxSize(): number {
        return this.#maxSize
    }

    get size(): number {
        return this.#size
    }

    /**
     * Sets a key-value pair in the map
     */
    set(key: number, value: T): void {
        const existingNode = this.#keyToNode.get(key)

        if (existingNode) {
            existingNode.value = value
            this.#moveToHead(existingNode)
            return
        }

        const newNode = new SortedLRUNode(key, value)

        if (this.#size >= this.maxSize) this.#evictLRU()

        this.#keyToNode.set(key, newNode)
        this.#insertSortedKey(key)
        this.#addToHead(newNode)
        this.#size++
    }

    /**
     * Gets a value by exact key match
     */
    get(key: number): T | undefined {
        const node = this.#keyToNode.get(key)
        if (!node) return

        this.#moveToHead(node)
        return node.value
    }

    /**
     * Finds the value associated with the key closest to the target
     */
    getClosest(target: number): { key: number; value: T } | undefined {
        if (!this.#size) return

        const closestKey = this.#findClosestKey(target)
        if (closestKey === undefined) return

        const node = this.#keyToNode.get(closestKey)
        if (!node) return

        this.#moveToHead(node)
        return { key: closestKey, value: node.value }
    }

    /**
     * Checks if a key exists in the map
     */
    has(key: number): boolean {
        return this.#keyToNode.has(key)
    }

    /**
     * Deletes a key-value pair from the map
     */
    delete(key: number): boolean {
        const node = this.#keyToNode.get(key)
        if (!node) return false

        this.#keyToNode.delete(key)
        this.#removeSortedKey(key)
        this.#removeNode(node)
        this.#size--

        return true
    }

    /**
     * Clears all entries from the map
     */
    clear(): void {
        this.#keyToNode.clear()
        this.#keyToSortedNode.clear()
        this.#size = 0

        if (this.#head && this.#tail) {
            this.#head.next = this.#tail
            this.#tail.prev = this.#head
        }

        this.#sortedKeysHead.next = this.#sortedKeysTail
        this.#sortedKeysTail.prev = this.#sortedKeysHead
    }

    /**
     * Returns all keys in sorted order
     */
    keys(): number[] {
        const keys: number[] = []
        let current = this.#sortedKeysHead.next
        while (current && current !== this.#sortedKeysTail) {
            keys.push(current.key)
            current = current.next
        }
        return keys
    }

    /**
     * Returns all values in the order of their keys (sorted)
     */
    *values(): Generator<T> {
        let current = this.#sortedKeysHead.next
        while (current && current !== this.#sortedKeysTail) {
            const node = this.#keyToNode.get(current.key)!
            yield node.value
            current = current.next
        }
    }

    /**
     * Returns all entries as [key, value] pairs in sorted key order
     */
    *entries(): Generator<[number, T]> {
        let current = this.#sortedKeysHead.next
        while (current && current !== this.#sortedKeysTail) {
            const node = this.#keyToNode.get(current.key)!
            yield [current.key, node.value]
            current = current.next
        }
    }

    #findClosestKey(target: number): number | undefined {
        if (this.#sortedKeysHead.next === this.#sortedKeysTail) return

        const keys: number[] = []
        let current = this.#sortedKeysHead.next
        while (current && current !== this.#sortedKeysTail) {
            keys.push(current.key)
            current = current.next
        }

        let left = 0
        let right = keys.length - 1
        let closest = keys[0]!
        let minDiff = Math.abs(target - closest)

        while (left <= right) {
            const mid = Math.floor((left + right) / 2)
            const midKey = keys[mid]!
            const diff = Math.abs(target - midKey)

            if (diff < minDiff) {
                minDiff = diff
                closest = midKey
            }

            if (midKey === target) return midKey

            if (midKey < target) left = mid + 1
            else right = mid - 1
        }

        // Check adjacent elements for potentially closer matches
        const index = keys.indexOf(closest)

        if (index > 0) {
            const leftKey = keys[index - 1]!
            if (Math.abs(target - leftKey) < minDiff) {
                closest = leftKey
                minDiff = Math.abs(target - leftKey)
            }
        }

        if (index < keys.length - 1) {
            const rightKey = keys[index + 1]!
            if (Math.abs(target - rightKey) < minDiff) closest = rightKey
        }

        return closest
    }

    #insertSortedKey(key: number): void {
        const newKeyNode = new SortedKeyNode(key)

        let current = this.#sortedKeysHead.next
        while (current && current !== this.#sortedKeysTail && current.key < key) {
            current = current.next
        }

        // Insert before current (or before tail if we reached the end)
        const prev = current!.prev!
        newKeyNode.prev = prev
        newKeyNode.next = current
        prev.next = newKeyNode
        current!.prev = newKeyNode

        this.#keyToSortedNode.set(key, newKeyNode)
    }

    #removeSortedKey(key: number): void {
        const keyNode = this.#keyToSortedNode.get(key)
        if (!keyNode) return

        if (keyNode.prev) keyNode.prev.next = keyNode.next
        if (keyNode.next) keyNode.next.prev = keyNode.prev

        this.#keyToSortedNode.delete(key)
    }

    #addToHead(node: SortedLRUNode): void {
        if (!this.#head) return

        node.prev = this.#head
        node.next = this.#head.next

        if (this.#head.next) this.#head.next.prev = node

        this.#head.next = node
    }

    #removeNode(node: SortedLRUNode): void {
        if (node.prev) node.prev.next = node.next
        if (node.next) node.next.prev = node.prev
    }

    #moveToHead(node: SortedLRUNode): void {
        this.#removeNode(node)
        this.#addToHead(node)
    }

    #evictLRU(): void {
        if (!this.#tail || !this.#tail.prev || this.#tail.prev === this.#head) return

        const lru = this.#tail.prev
        this.#keyToNode.delete(lru.key)
        this.#removeSortedKey(lru.key)
        this.#removeNode(lru)
        this.#size--
    }
}
