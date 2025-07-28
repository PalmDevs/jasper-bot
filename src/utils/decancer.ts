import decancer_ from 'decancer'

export function decancer(input: string) {
    const inst = decancer_(input, {
        asciiOnly: true,
    })

    inst.replace(' ', '')

    return inst
}
