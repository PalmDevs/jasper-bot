import decancer_ from 'decancer'

export function decancer(input: string) {
    return decancer_(input, {
        asciiOnly: true,
        retainEmojis: true,
        retainGreek: true,
    })
}
