import { mock } from 'bun:test'
import {
    ApplicationIntegrationTypes,
    ChannelTypes,
    type CommandInteraction,
    type Guild,
    InteractionContextTypes,
    type Member,
    type Message,
    type TextChannel,
    type User,
} from 'oceanic.js'
import { type AnyChatCommand, ChatCommand } from '~/classes/commands/ChatCommand'
import { CommandTriggers } from '~/classes/commands/Command'

export const createMockExecutor = (id = '123') => ({ id }) as User

export const createMockTrigger = (options: Partial<Message | CommandInteraction> = {}) =>
    ({
        id: '123',
        channelID: '456',
        guildID: '789',
        ...options,
    }) as Message | CommandInteraction

export const createMockMessage = (options: Partial<Message> = {}) =>
    ({
        id: '123',
        channelID: '456',
        ...options,
    }) as Message

export const createBasicCommand = (
    overrides: Partial<ConstructorParameters<typeof ChatCommand>[0]> = {},
): AnyChatCommand =>
    new ChatCommand({
        name: 'test',
        description: 'test command',
        options: [],
        triggers: CommandTriggers.PlatformImplementation,
        contexts: [InteractionContextTypes.GUILD],
        integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
        execute: () => {},
        ...overrides,
    })

export const MockChannel = {
    id: '123',
    type: ChannelTypes.GUILD_TEXT,
    messages: { get: mock((id: string) => ({ id })) },
} as unknown as TextChannel

export const MockUser = { id: '123' } as any
export const MockRole = { id: '123' } as any
export const MockAttachment = { id: '123' } as any

export const MockMember = {
    id: '123',
    roles: ['123'],
    permissions: {
        has: mock((bit: bigint) => (1n & bit) === 1n),
    },
} as unknown as Member

export const MockGuild = {
    members: { get: mock(() => MockMember) },
    memberSearch: mock(() => Promise.resolve({ members: [{ member: { user: MockUser } }] })),
    roles: new Map([['123', MockRole]]),
} as unknown as Guild

export const MockBot = {
    rest: {
        channels: {
            createMessage: mock(() => Promise.resolve({})),
        },
        guilds: {
            get: mock(() => Promise.resolve(MockGuild)),
        },
        users: {
            get: mock(() => Promise.resolve(MockUser)),
        },
    },
    getChannel: mock(() => Promise.resolve(MockChannel)),
    users: { get: mock(() => MockUser) },
    guilds: { get: mock(() => MockGuild) },
}

export const MockCommandInteraction = class CommandInteraction {
    id = '123'
    channelID = '456'
    guildID = '789'
    createFollowup = mock(() => Promise.resolve({ message: {} }))
}
