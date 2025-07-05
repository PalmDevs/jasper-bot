import chalkTemplate from 'chalk-template'
import { Client, type CreateMessageOptions, Intents } from 'oceanic.js'
import type { AnyCommand } from './classes/commands/Command'

export const bot = new Client({
    auth: `Bot ${process.env.DISCORD_TOKEN}`,
    collectionLimits: {
        messages: 100,
        members: 10,
        users: 10,
        // Unneeded cache
        auditLogEntries: 0,
        autoModerationRules: 0,
        emojis: 0,
        groupChannels: 0,
        integrations: 0,
        invites: 0,
        privateChannels: 0,
        scheduledEvents: 0,
        soundboardSounds: 0,
        stageInstances: 0,
        stickers: 0,
        voiceMembers: 0,
        voiceStates: 0,
    },
    allowedMentions: {
        everyone: false,
        repliedUser: true,
        roles: false,
        users: true,
    },
    gateway: {
        intents:
            Intents.GUILDS |
            Intents.GUILD_MESSAGES |
            Intents.MESSAGE_CONTENT |
            Intents.GUILD_MESSAGE_REACTIONS |
            Intents.GUILD_MEMBERS,
    },
})

export const log = {
    error: (tag, ...args) => console.error(chalkTemplate`{redBright ERROR >} {gray [${tag}]:}`, ...args),
    warn: (tag, ...args) => console.warn(chalkTemplate`{yellowBright WARN >} {gray [${tag}]:}`, ...args),
    trace: (tag, ...args) => {
        if (process.env.DEBUG) console.trace(chalkTemplate`{redBright TRACE >} {gray [${tag}]:}`, ...args)
    },
    info: (tag, ...args) => console.info(chalkTemplate`{cyanBright INFO >} {gray [${tag}]:}`, ...args),
    debug: (tag, ...args) => {
        if (process.env.DEBUG) console.debug(chalkTemplate`{gray DEBUG >} {gray [${tag}]:}`, ...args)
    },
    log: (tag, ...args) => console.log(chalkTemplate`{gray [${tag}]}`, ...args),
} satisfies {
    [K in 'error' | 'warn' | 'trace' | 'info' | 'debug' | 'log']: (tag: string, ...args: [any, ...any[]]) => void
}

export interface Config {
    admin: {
        users: string[]
    }
    mod?: {
        mute?: {
            reapplyTimeoutInterval: number
        }
        guilds: {
            [guildId: string]: {
                roles: string[]
                log?: {
                    channel: string
                    thread?: string
                }
            }
        }
    }
    autorole?: {
        [guildId: string]: string[]
    }
    notes?: {
        [guildId: string]: {
            [note: string]: CreateMessageOptions
        }
    }
    prefix: {
        matches: string[]
        mentions: boolean
    }
}

export const config = require('../config.js').default as Config

export const commands = new Map<string, AnyCommand>()
