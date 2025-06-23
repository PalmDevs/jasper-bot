const WhiteSpaces = new Set([' ', '\t', '\n', '\r', '\f', '\v'])
const Quotes = new Set(['"', '`', "'"])
const EscapePrefix = '\\'

export function* parseArguments(input: string): Generator<string> {
    const n = input.length
    let i = 0
    let quote: string | undefined

    while (i < n) {
        // Skip leading whitespace
        while (i < n && WhiteSpaces.has(input[i]!)) i++

        if (i >= n) break // No more arguments? :nobitches:

        let arg = ''

        // First character of the argument
        const firstChar = input[i]!

        // Quoted arguments
        if (Quotes.has(firstChar)) {
            quote = firstChar
            i++

            while (i < n) {
                const char = input[i]!

                if (char === EscapePrefix) {
                    // Escape sequence
                    if (i++ < n) arg += input[i++]!
                } else if (char === quote) {
                    // End of quoted argument
                    i++
                    break
                }
                // Normal quoted content
                else {
                    arg += char
                    i++
                }
            }
        }
        // Unquoted arguments: Simply read until whitespace
        else while (i < n && !WhiteSpaces.has(input[i]!)) arg += input[i++]!

        yield arg
    }
}
