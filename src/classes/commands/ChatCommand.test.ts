import { beforeEach, describe, expect, mock, test } from 'bun:test'
import {
    ApplicationCommandOptionTypes,
    ApplicationCommandTypes,
    ApplicationIntegrationTypes,
    InteractionContextTypes,
} from 'oceanic.js'
import {
    createBasicCommand,
    createMockExecutor,
    createMockMessage,
    createMockTrigger,
    MockAttachment,
    MockBot,
    MockChannel,
    MockCommandInteraction,
    MockMember,
    MockRole,
    MockUser,
} from '~/__tests__/mocks'
import { getChannel } from '~/utils/channels'
import { getMember } from '~/utils/guilds'
import { getMessageReference } from '~/utils/messages'
import { ChatCommand } from './ChatCommand'
import { ChatCommandOptionTypes } from './ChatCommandConstants'
import { CommandAccessMatchMode, CommandTriggers } from './Command'
import type { ChatCommandOptions } from './ChatCommand'

// Module mocks
mock.module('~/context', () => ({
    bot: MockBot,
    log: console,
}))

mock.module('oceanic.js', () => ({
    CommandInteraction: MockCommandInteraction,
}))

// Utility function mocks
mock(getMember).mockImplementation(() => Promise.resolve(MockMember))
mock(getChannel).mockImplementation(() => Promise.resolve(MockChannel))
mock(getMessageReference).mockImplementation(() => Promise.resolve(createMockMessage()))

describe('ChatCommand', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        mock(getMember).mockReset()
        mock(getChannel).mockReset()
        mock(getMessageReference).mockReset()

        // Set up default implementations
        mock(getMember).mockImplementation(() => Promise.resolve(MockMember))
        mock(getChannel).mockImplementation(() => Promise.resolve(MockChannel))
        mock(getMessageReference).mockImplementation(() => Promise.resolve(createMockMessage()))
    })

    test('canExecuteViaTrigger returns correct boolean', () => {
        const cmd = createBasicCommand({ triggers: CommandTriggers.PlatformImplementation })

        expect(ChatCommand.canExecuteViaTrigger(cmd, CommandTriggers.PlatformImplementation)).toBe(true)
        expect(ChatCommand.canExecuteViaTrigger(cmd, CommandTriggers.ChatMessage)).toBe(false)
    })

    test('canExecuteInContext returns correct boolean', () => {
        const cmd = createBasicCommand({ contexts: [InteractionContextTypes.GUILD] })

        expect(ChatCommand.canExecuteInContext(cmd, InteractionContextTypes.GUILD)).toBe(true)
        expect(ChatCommand.canExecuteInContext(cmd, InteractionContextTypes.BOT_DM)).toBe(false)
    })

    describe('canExecute', () => {
        test('returns true if no access is defined', async () => {
            const cmd = createBasicCommand()
            const context = {
                trigger: createMockTrigger(),
                executor: createMockExecutor(),
            }

            const result = await ChatCommand.canExecute(cmd, context)
            expect(result).toBe(true)
        })

        test('respects user access', async () => {
            const cmd = createBasicCommand({
                access: {
                    users: ['123'],
                    match: CommandAccessMatchMode.Some,
                },
            })

            const context1 = {
                trigger: createMockTrigger(),
                executor: createMockExecutor('123'),
            }
            const result1 = await ChatCommand.canExecute(cmd, context1)
            expect(result1).toBe(true)

            const context2 = {
                trigger: createMockTrigger(),
                executor: createMockExecutor('456'),
            }
            const result2 = await ChatCommand.canExecute(cmd, context2)
            expect(result2).toBe(false)
        })

        test('respects channel access', async () => {
            const cmd = createBasicCommand({
                access: {
                    channels: ['456'],
                    match: CommandAccessMatchMode.All,
                },
            })

            const context1 = {
                trigger: createMockTrigger({ channelID: '456' }),
                executor: createMockExecutor(),
            }
            const result1 = await ChatCommand.canExecute(cmd, context1)
            expect(result1).toBe(true)

            const context2 = {
                trigger: createMockTrigger({ channelID: '789' }),
                executor: createMockExecutor(),
            }
            const result2 = await ChatCommand.canExecute(cmd, context2)
            expect(result2).toBe(false)
        })

        test('respects guild access', async () => {
            const cmd = createBasicCommand({
                access: {
                    guilds: ['789'],
                    match: CommandAccessMatchMode.Some,
                },
            })

            const context1 = {
                trigger: createMockTrigger({ guildID: '789' }),
                executor: createMockExecutor(),
            }
            const result1 = await ChatCommand.canExecute(cmd, context1)
            expect(result1).toBe(true)

            const context2 = {
                trigger: createMockTrigger({ guildID: '123' }),
                executor: createMockExecutor(),
            }
            const result2 = await ChatCommand.canExecute(cmd, context2)
            expect(result2).toBe(false)
        })

        test('respects permission access', async () => {
            // Test with a permission that should fail first
            const cmd = createBasicCommand({
                access: {
                    permissions: 2n, // Use permission 2n, default mock checks (1n & bit) === 1n
                    match: CommandAccessMatchMode.Some,
                },
            })

            const context = {
                trigger: createMockTrigger(),
                executor: createMockExecutor(),
            }

            // First test: member doesn't have the required permission (2n & 1n !== 1n)
            const result1 = await ChatCommand.canExecute(cmd, context)
            expect(result1).toBe(false)

            // Test with permission 1n which should pass with default mock
            cmd.access!.permissions = 1n
            const result2 = await ChatCommand.canExecute(cmd, context)
            expect(result2).toBe(true)
        })

        test('respects role access', async () => {
            // Test with a role that exists in the default member
            const cmd = createBasicCommand({
                access: {
                    roles: ['123'], // Use role the default mockMember has
                    match: CommandAccessMatchMode.Some,
                },
            })

            const context = {
                trigger: createMockTrigger(),
                executor: createMockExecutor(),
            }

            // Should pass because mockMember has role '123'
            const result1 = await ChatCommand.canExecute(cmd, context)
            expect(result1).toBe(true)

            // Test with a role that doesn't exist in the member
            // But need to also include a permission check since role-only checks
            // don't yield anything when no roles match
            const cmdWithFailingRole = createBasicCommand({
                access: {
                    roles: ['999'], // Role the member doesn't have
                    permissions: 2n, // Permission that will fail
                    match: CommandAccessMatchMode.All, // All checks must pass
                },
            })

            const result2 = await ChatCommand.canExecute(cmdWithFailingRole, context)
            expect(result2).toBe(false)
        })

        test('respects predicate access', async () => {
            const cmd = createBasicCommand({
                access: {
                    predicate: () => true,
                    match: CommandAccessMatchMode.All,
                },
            })

            const context = {
                trigger: createMockTrigger(),
                executor: createMockExecutor(),
            }
            const result1 = await ChatCommand.canExecute(cmd, context)
            expect(result1).toBe(true)

            // Change predicate to return false
            cmd.access!.predicate = () => false
            const result2 = await ChatCommand.canExecute(cmd, context)
            expect(result2).toBe(false)
        })

        test('respects complex match modes', async () => {
            const cmd = createBasicCommand({
                access: {
                    users: ['123'],
                    channels: ['456'],
                    guilds: ['789'],
                    roles: ['123'],
                    permissions: 1n,
                    match: CommandAccessMatchMode.All,
                },
            })

            const context = {
                trigger: createMockTrigger(),
                executor: createMockExecutor(),
            }
            const result1 = await ChatCommand.canExecute(cmd, context)
            expect(result1).toBe(true)

            // Add a failing predicate
            cmd.access!.predicate = () => false
            const result2 = await ChatCommand.canExecute(cmd, context)
            expect(result2).toBe(false)
        })
    })

    describe('toApplicationCommand', () => {
        test('converts ChatCommand to CreateChatInputCommandOptions', () => {
            const cmd = createBasicCommand({
                name: 'test',
                description: 'test command',
                contexts: [InteractionContextTypes.GUILD, InteractionContextTypes.BOT_DM],
                integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL, ApplicationIntegrationTypes.USER_INSTALL],
            })

            const result = ChatCommand.toApplicationCommand(cmd)

            expect(result.name).toBe('test')
            expect(result.description).toBe('test command')
            expect(result.options).toEqual([])
            expect(result.type).toBe(ApplicationCommandTypes.CHAT_INPUT)
            expect(result.contexts).toEqual([InteractionContextTypes.GUILD, InteractionContextTypes.BOT_DM])
            expect(result.integrationTypes).toEqual([
                ApplicationIntegrationTypes.GUILD_INSTALL,
                ApplicationIntegrationTypes.USER_INSTALL,
            ])
        })

        test('converts ChatCommandOptionTypes.MESSAGE to ApplicationCommandOptionTypes.STRING', () => {
            const cmd = createBasicCommand({
                options: [
                    {
                        type: ChatCommandOptionTypes.MESSAGE,
                        name: 'message1',
                        description: 'message option',
                        required: true,
                    },
                ],
                contexts: [InteractionContextTypes.GUILD, InteractionContextTypes.BOT_DM],
                integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL, ApplicationIntegrationTypes.USER_INSTALL],
            })

            const result = ChatCommand.toApplicationCommand(cmd)

            expect(result.options).toEqual([
                {
                    type: ApplicationCommandOptionTypes.STRING,
                    name: 'message1',
                    description: 'message option',
                    required: true,
                },
            ])
        })
    })

    describe('createExecuteActions', () => {
        test('reply with CommandInteraction', async () => {
            const intr = new MockCommandInteraction()
            const actions = ChatCommand.createExecuteActions(intr as any)

            await actions.reply({ content: 'test' })

            expect(intr.createFollowup).toHaveBeenCalledWith({ content: 'test' })
        })

        test('reply with Message', async () => {
            const msg = createMockMessage({ id: '123', channelID: '456' })
            const actions = ChatCommand.createExecuteActions(msg as any)

            await actions.reply({ content: 'test' })

            expect(MockBot.rest.channels.createMessage).toHaveBeenCalledWith('456', {
                content: 'test',
                messageReference: {
                    messageID: '123',
                    failIfNotExists: true,
                },
            })
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

            const result = await ChatCommand.optionsFromInteraction({ data: { options: wrapper } } as any, opts)

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

        const result = await ChatCommand.optionsFromInteraction({ data: { options: wrapper } } as any, opts)

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

        const result = await ChatCommand.optionsFromInteraction({ data: { options: {} } } as any, opts)

        expect(result).toEqual({ sub1: true })
    })
})
