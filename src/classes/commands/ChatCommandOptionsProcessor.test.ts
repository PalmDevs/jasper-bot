import { describe, expect, mock, test } from 'bun:test'
import { ApplicationCommandOptionTypes, Attachment, type Client, TypedCollection } from 'oceanic.js'
import { createMockMessage, MockAttachment, MockBot, MockChannel, MockRole, MockUser } from '~/__tests__/mocks'
import { getChannel } from '~/utils/channels'
import { parseArguments } from '~/utils/parsers'
import { UserError } from '../Error'
import { ChatCommandOptionTypes } from './ChatCommandConstants'
import { optionsFromInteraction, optionsFromMessage } from './ChatCommandOptionsProcessor'
import type { ChatCommandOptions, ChatCommandOptionsStringWithResolver } from './ChatCommand'

describe('ChatCommandOptionsProcessor', () => {
    describe('optionsFromMessage', () => {
        const msg = createMockMessage({})

        test('parses subcommand (group) options', async () => {
            const opts: ChatCommandOptions[] = [
                {
                    type: ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
                    name: 'group1',
                    description: 'desc',
                    options: [
                        {
                            type: ApplicationCommandOptionTypes.SUB_COMMAND,
                            name: 'sub1',
                            description: 'desc',
                            options: [
                                {
                                    type: ApplicationCommandOptionTypes.STRING,
                                    name: 'string1',
                                    description: 'desc',
                                    required: true,
                                },
                            ],
                        },
                    ],
                },
            ]
            // Test with main name
            let parser = parseArguments('group1 sub1 string1')
            let result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ group1: { sub1: { string1: 'string1' } } })
            // Test with subcommand group alias
            parser = parseArguments('group1 sub1 string1')
            result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ group1: { sub1: { string1: 'string1' } } })
            // Test with subcommand alias
            parser = parseArguments('group1 sub1 string1')
            result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ group1: { sub1: { string1: 'string1' } } })
            // Test with subcommand group alias
            parser = parseArguments('group1 sub1 string1')
            result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ group1: { sub1: { string1: 'string1' } } })
        })

        test('parses subcommand without options', async () => {
            const opts: ChatCommandOptions[] = [
                {
                    type: ApplicationCommandOptionTypes.SUB_COMMAND,
                    name: 'sub1',
                    description: 'desc',
                },
            ]
            const parser = parseArguments('sub1')
            const result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ sub1: true })
        })

        test('parses string options', async () => {
            // Basic string option
            let opts: ChatCommandOptions[] = [
                { type: ApplicationCommandOptionTypes.STRING, name: 'string1', description: 'desc', required: true },
            ]
            let parser = parseArguments('test')
            let result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ string1: 'test' })

            // String with greedy option
            opts = [
                { type: ApplicationCommandOptionTypes.STRING, name: 'string1', description: 'desc', required: true },
                {
                    type: ApplicationCommandOptionTypes.STRING,
                    name: 'string2',
                    description: 'desc',
                    required: true,
                    greedy: true,
                },
            ]
            parser = parseArguments('test1 test2 test3')
            result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ string1: 'test1', string2: 'test2 test3' })

            // String with resolver
            opts = [
                {
                    type: ApplicationCommandOptionTypes.STRING,
                    name: 'string1',
                    description: 'desc',
                    resolver: () => true,
                },
            ]
            parser = parseArguments('aaa')
            result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ string1: true })

            // String with resolver that calls pass()
            opts = [
                {
                    type: ApplicationCommandOptionTypes.STRING,
                    name: 'string1',
                    description: 'desc',
                    resolver: (_, pass) => pass(),
                },
                {
                    type: ApplicationCommandOptionTypes.STRING,
                    name: 'string2',
                    description: 'desc',
                    greedy: true,
                },
            ]
            parser = parseArguments('aaa bbb')
            result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ string2: 'aaa bbb' })
        })

        test('parses numeric options', async () => {
            // Integer
            const intOpts = [
                { type: ApplicationCommandOptionTypes.INTEGER, name: 'int1', description: 'desc', required: true },
            ] as ChatCommandOptions[]
            let parser = parseArguments('123')
            let result = await optionsFromMessage(msg, parser, intOpts)
            expect(result).toEqual({ int1: 123 })

            // Number (float)
            const numOpts = [
                { type: ApplicationCommandOptionTypes.NUMBER, name: 'num1', description: 'desc', required: true },
            ] as ChatCommandOptions[]
            parser = parseArguments('123.45')
            result = await optionsFromMessage(msg, parser, numOpts)
            expect(result).toEqual({ num1: 123.45 })
        })

        test('parses boolean options', async () => {
            const opts = [
                { type: ApplicationCommandOptionTypes.BOOLEAN, name: 'bool1', description: 'desc', required: true },
            ] as ChatCommandOptions[]

            // Test truthy values
            for (const value of ['true', '1', 'yes', 'y', 'on', 't']) {
                const parser = parseArguments(value)
                const result = await optionsFromMessage(msg, parser, opts)
                expect(result).toEqual({ bool1: true })
            }

            // Test falsy values
            for (const value of ['false', '0', 'no', 'n', 'off', 'f']) {
                const parser = parseArguments(value)
                const result = await optionsFromMessage(msg, parser, opts)
                expect(result).toEqual({ bool1: false })
            }
        })

        test('parses channel options', async () => {
            mock(getChannel).mockImplementation(() => Promise.resolve(MockChannel))

            const opts = [
                { type: ApplicationCommandOptionTypes.CHANNEL, name: 'channel1', description: 'desc', required: true },
            ] as ChatCommandOptions[]
            const parser = parseArguments('<#123>')

            const result = await optionsFromMessage(msg, parser, opts)
            expect(result.channel1.id).toEqual('123')
        })

        test('parses user options', async () => {
            MockBot.users.get.mockImplementation(() => MockUser)

            const opts = [
                { type: ApplicationCommandOptionTypes.USER, name: 'user1', description: 'desc', required: true },
            ] as ChatCommandOptions[]
            const parser = parseArguments('<@123>')

            const result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ user1: MockUser })
        })

        test('parses message options', async () => {
            const opts = [
                { type: ChatCommandOptionTypes.MESSAGE, name: 'message1', description: 'desc', required: true },
            ] as ChatCommandOptions[]
            const parser = parseArguments('123')

            const result = await optionsFromMessage(createMockMessage({ id: '123' }), parser, opts)
            expect(result).toEqual({ message1: { id: '123' } })
        })

        test('parses attachment options', async () => {
            const opts: ChatCommandOptions[] = [
                {
                    type: ApplicationCommandOptionTypes.ATTACHMENT,
                    name: 'attachment1',
                    description: 'desc',
                    required: true,
                },
            ]

            const attachments = new TypedCollection(Attachment, MockBot as unknown as Client)
            attachments.add(MockAttachment)

            const msg = createMockMessage({ attachments })
            const parser = parseArguments('')

            const result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ attachment1: MockAttachment })
        })

        test('handles validation errors', async () => {
            const opts = [
                { type: ApplicationCommandOptionTypes.STRING, name: 'string1', description: 'desc', required: true },
            ] as ChatCommandOptions[]
            const parser = parseArguments('')

            await expect(optionsFromMessage(msg, parser, opts)).rejects.toThrow(UserError)
        })

        test('handles optional options', async () => {
            const opts = [
                { type: ApplicationCommandOptionTypes.STRING, name: 'string1', description: 'desc', required: false },
            ] as ChatCommandOptions[]
            const parser = parseArguments('')

            const result = await optionsFromMessage(msg, parser, opts)
            expect(result).toEqual({ string1: undefined })
        })
    })

    describe('optionsFromInteraction', () => {
        test('extracts options correctly from interaction wrapper', async () => {
            const opts = [
                { type: ApplicationCommandOptionTypes.STRING, name: 'string1', description: 'desc', required: true },
                { type: ApplicationCommandOptionTypes.INTEGER, name: 'int1', description: 'desc', required: true },
                { type: ApplicationCommandOptionTypes.NUMBER, name: 'num1', description: 'desc', required: true },
                { type: ApplicationCommandOptionTypes.BOOLEAN, name: 'bool1', description: 'desc', required: true },
                { type: ApplicationCommandOptionTypes.CHANNEL, name: 'channel1', description: 'desc', required: true },
                { type: ApplicationCommandOptionTypes.USER, name: 'user1', description: 'desc', required: true },
                {
                    type: ApplicationCommandOptionTypes.ATTACHMENT,
                    name: 'attachment1',
                    description: 'desc',
                    required: true,
                },
            ] as ChatCommandOptions[]

            const wrapper = {
                getString: mock(() => 'test'),
                getInteger: mock(() => 123),
                getNumber: mock(() => 123.45),
                getBoolean: mock(() => true),
                getChannel: mock(() => MockChannel),
                getUser: mock(() => MockUser),
                getAttachment: mock(() => MockAttachment),
                getRole: mock(() => MockRole),
            } as any

            const result = await optionsFromInteraction({ data: { options: wrapper } } as any, opts)

            expect(result).toEqual({
                string1: 'test',
                int1: 123,
                num1: 123.45,
                bool1: true,
                channel1: MockChannel,
                user1: MockUser,
                attachment1: MockAttachment,
            })

            // Verify all wrapper methods were called with correct parameters
            expect(wrapper.getString).toHaveBeenCalledWith('string1', true)
            expect(wrapper.getInteger).toHaveBeenCalledWith('int1', true)
            expect(wrapper.getNumber).toHaveBeenCalledWith('num1', true)
            expect(wrapper.getBoolean).toHaveBeenCalledWith('bool1', true)
            expect(wrapper.getChannel).toHaveBeenCalledWith('channel1', true)
            expect(wrapper.getUser).toHaveBeenCalledWith('user1', true)
            expect(wrapper.getAttachment).toHaveBeenCalledWith('attachment1', true)
        })

        test('extracts options from interaction with subcommand (groups)', async () => {
            const opts: ChatCommandOptions[] = [
                {
                    type: ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
                    name: 'group1',
                    description: 'desc',
                    options: [
                        {
                            type: ApplicationCommandOptionTypes.SUB_COMMAND,
                            name: 'sub1',
                            description: 'desc',
                            options: [
                                {
                                    type: ApplicationCommandOptionTypes.STRING,
                                    name: 'string1',
                                    description: 'desc',
                                    required: true,
                                },
                            ],
                        },
                    ],
                },
            ]

            const wrapper = {
                getString: mock(() => 'test'),
            } as any

            const result = await optionsFromInteraction({ data: { options: wrapper } } as any, opts)

            expect(result).toEqual({ group1: { sub1: { string1: 'test' } } })
            expect(wrapper.getString).toHaveBeenCalledWith('string1', true)
        })

        test('extracts options from interaction with subcommand with no options', async () => {
            const opts: ChatCommandOptions[] = [
                {
                    type: ApplicationCommandOptionTypes.SUB_COMMAND,
                    name: 'sub1',
                    description: 'desc',
                },
            ]

            const result = await optionsFromInteraction({ data: { options: {} } } as any, opts)

            expect(result).toEqual({ sub1: true })
        })

        test('handles string options with resolver', async () => {
            const stringOption = {
                type: ApplicationCommandOptionTypes.STRING,
                name: 'string1',
                description: 'desc',
                resolver: () => true,
            } as ChatCommandOptionsStringWithResolver<true>
            const opts: ChatCommandOptions[] = [stringOption]

            const wrapper = {
                getString: mock(() => 'test'),
            } as any

            const result = await optionsFromInteraction({ data: { options: wrapper } } as any, opts)

            expect(result).toEqual({ string1: true })
            expect(wrapper.getString).toHaveBeenCalledWith(stringOption.name, stringOption.required)
        })
    })
})
