import { expect, test } from 'bun:test'
import { parseArguments } from './parsers'

test('parseArguments returns a generator', () => {
    expect(parseArguments('').constructor.name === 'GeneratorFunction')
})

test('parseArguments parses simple arguments', () => {
    const input = 'arg1 arg2 arg3'
    const parser = parseArguments(input)

    const result = [...parser]
    expect(result).toEqual(['arg1', 'arg2', 'arg3'])
})

test('parseArguments parses quoted arguments', () => {
    const input = '"arg 1" `arg2` \'arg 3\''
    const parser = parseArguments(input)

    const result = [...parser]
    expect(result).toEqual(['arg 1', 'arg2', 'arg 3'])
})

test('parseArguments handles nested quotes', () => {
    const input = '"arg 1" `arg2 "nested"` \'arg 3\''
    const parser = parseArguments(input)

    const result = [...parser]
    expect(result).toEqual(['arg 1', 'arg2 "nested"', 'arg 3'])
})

test('parseArguments handles escaped quotes', () => {
    const input = '"arg 1" `arg2 \\`escaped\\`` \'arg 3\''
    const parser = parseArguments(input)

    const result = [...parser]
    expect(result).toEqual(['arg 1', 'arg2 `escaped`', 'arg 3'])
})

test('parseArguments handles complex cases', () => {
    const input = `arg1 "arg 2" ""   'arg4 more text' "arg5 text" \`arg6 more more text \\\` \\\\\` 'arg7 arg8" \\' '   'nested "quotes"' \\ '\\'`
    const parser = parseArguments(input)

    const result = [...parser]
    expect(result).toEqual([
        'arg1',
        'arg 2',
        '',
        'arg4 more text',
        'arg5 text',
        'arg6 more more text ` \\',
        'arg7 arg8" \' ',
        'nested "quotes"',
        '\\',
        "'",
    ])
})
