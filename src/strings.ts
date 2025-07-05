import chalkTemplate from 'chalk-template'
import { ApplicationCommandOptionTypes } from 'oceanic.js'
import { ChatCommandOptionTypes } from './classes/commands/ChatCommandConstants'
import { Emojis } from './constants'
import { log } from './context'
import { bold, code, codeblock, emoji } from './utils/formatters'

interface Strings {
    status: {
        watching: RandomizableStringifiable
        listening: RandomizableStringifiable
    }
    error: {
        user: RandomizableStringifiable
        self: RandomizableStringifiable
        generic: RandomizableStringifiable
        stack: StringifableDynamic
    }
    generic: {
        [K: string]: Stringifiable | RandomizableStringifiable | StringDict
        command: StringDict
    }
    command: Record<string, StringDict>
}

const STRINGS = {
    command: {
        is: {
            response: [
                'Yeah, probably.',
                'Yeah, whatever.',
                'Probably.',
                'Sure.',
                'Yeah.',
                'I guess so.',
                'I guess.',
                'I mean, sure.',
                'Eh, whatever.',
                'Yeah yeah, whatever.',
                'I mean, I guess so.',
                // Neutral
                'Whatever.',
                'Ask again later.',
                'Why are you asking me?',
                "I don't know, take a guess.",
                'Why would I know?',
                "That's a stupid question.",
                "I ain't a fortune teller.",
                'What kind of question is that?',
                "Not answerin' that.",
                'Try asking someone else.',
                'Eh.',
                // Negative
                'Definitely not.',
                'For sure! For sure...',
                "Wouldn't bet on that.",
                'Yeah, no.',
                'Doubt it.',
                'Tough luck.',
                'Nah.',
                "I don't think so.",
                'Not a chance.',
                'You wish.',
                "You bet, and you'd lose.",
            ],
        },
        eval: {
            outputTooLarge: '(Output too large, file uploaded)',
            outputFileName: 'eval-output.txt',
        },
        hello: {
            response: [
                'Ugh, fuck off.',
                'What do you want?',
                'State your business.',
                'Shut up.',
                '?',
                'Hm?',
                'Leave me alone.',
                () => emoji(Emojis.jasper),
                () => emoji(Emojis.mentioned),
                () => emoji(Emojis.confused),
                "One day, I'll be able to get away with muting you.",
                'Why are you...?',
                'Stop it.',
                'Keep that to yourself.',
                "I don't get paid enough for this.",
                'Go annoy someone else.',
                'Is this fun for you?',
                'Can you not?',
                'Leave already.',
                '...',
                'Stop.',
                'What is it?',
                'Oh for fucks sake...',
                'Spit it out.',
                'Make it quick.',
                'What?',
            ],
        },
        note: {
            noConfig: (guildName: string) => `No notes configured for ${guildName}.`,
            allTitle: (guildName: string) => `Notes in ${guildName}`,
            all: (notes: string[]) => `${notes.map(code).join(', ')}`,
            notFound: 'Note not found. Run without any options to see all notes in this server.',
        },
        purge: {
            success: (amount: number) => `Purged ${amount} messages.`,
        },
        register: {
            success: 'Slash commands registered successfully.',
        },
        reply: {
            success: 'Fine.',
        },
        role: {
            reason: (tag: string, id: string) => `via command by ${tag} (${id})`,
            added: 'Added role',
            removed: 'Removed role',
        },
        slowmode: {
            success: (duration: string) => `Set slowmode for ${duration}.`,
        },
        stop: {
            response: 'Thanks, I can finally go back to doing a bunch of nothing properly.',
        },
        who: {
            title: ['Who am I?', 'Introduce myself? Uh...', 'What do I do? Eh...', 'Huh, what? Oh, right. Hey.'],
            description:
                "I'm Jasper. Your favorite raccoon guy to bother when you're bored. I provide assistance... and some amount of yelling. I sit around doing a whole bunch of nothing, really. Unless I'm forced into doing something.",
            version: 'Version',
            uptime: 'Been up since...',
        },
    },
    status: {
        watching: ['the world burn', "whatever's on my screen", 'the drama unfold'],
        listening: ['your complaints', 'the voices in my head', 'stupid discussions in chat'],
    },
    error: {
        stack: (err: string) => `This is what went wrong, apparently:\n${codeblock(err, 'js')}`,
        generic: [
            'Ugh, something went wrong.',
            "You gotta be shittin' me.",
            "Looks like it ain't workin' out.",
            'Something blew up.',
        ],
        user: ['Are you stupid?', "Uh, 'ya good?", 'The hell is this?'],
        self: ['No, thank you.', 'Nope, not gonna happen.', "I'm not doing that.", 'Not today.'],
    },
    generic: {
        role: 'Role',
        user: 'User',
        moderator: 'Moderator',
        channel: 'Channel',
        guild: 'Server',
        member: 'Member',
        reason: 'Reason',
        expires: 'Expires',
        usage: 'Usage',
        command: {
            defaults: {
                reason: '(No reason provided)',
            },
            errors: {
                memberNotPunishable: (mention: string) =>
                    `Can't do that to ${mention}. I don't exactly want to get demoted, you know?`,
                userNotInGuild: (mention: string) => `Did ${mention} just leave? Guess they couldn't handle the heat.`,
                invalidDuration: (arg: string) => `I don\'t know how long ${code(arg)} is. Pass me a normal duration.`,
                badDuration: (min?: string, max?: string) => {
                    let str = "Can't set a timer for that duration."
                    if (min !== undefined && max !== undefined)
                        str += ` Pass me something between ${bold(min)} and ${bold(max)}.`
                    else if (min !== undefined) str += ` Pass me something longer than ${bold(min)}.`
                    else if (max !== undefined) str += ` Pass me something shorter than ${bold(max)}.`
                    return str
                },
            },
            option: {
                [ApplicationCommandOptionTypes.SUB_COMMAND]: 'subcommand',
                [ApplicationCommandOptionTypes.SUB_COMMAND_GROUP]: 'subcommand group',
                [ApplicationCommandOptionTypes.STRING]: 'string',
                [ApplicationCommandOptionTypes.INTEGER]: 'integer',
                [ApplicationCommandOptionTypes.BOOLEAN]: 'boolean',
                [ApplicationCommandOptionTypes.NUMBER]: 'number',
                [ApplicationCommandOptionTypes.ROLE]: 'role',
                [ApplicationCommandOptionTypes.USER]: 'user',
                [ApplicationCommandOptionTypes.CHANNEL]: 'channel',
                [ApplicationCommandOptionTypes.MENTIONABLE]: 'mention',
                [ApplicationCommandOptionTypes.ATTACHMENT]: 'attachment',
                [ChatCommandOptionTypes.MESSAGE]: 'message',
            },
            validators: {
                missing: (name: string, type: string) =>
                    `You forgot to pass somethin' for the ${code(name)}! It should be some kind of ${bold(type)}.`,
                invalid: (name: string, type: string) =>
                    `You must pass some ${bold(type)} for the ${code(name)}! Not whatever that was.`,
                notExists: (name: string, type: string) =>
                    `The ${code(name)} doesn't even exist. Make sure you pass a valid ${bold(type)}.`,
                subcommands: {
                    missing: (choices: string[]) =>
                        `You forgot to pass a subcommand. Pick one of them.\n${choices.map(code).join(', ')}`,
                    invalid: (arg: string, choices: string[]) =>
                        `I have no idea what you mean by ${code(arg)} for a subcommand. Pick one of these.\n${choices.map(code).join(', ')}.`,
                },
                strings: {
                    badChoice: (name: string, choices: string[]) =>
                        `You can only pass ${choices.map(code).join(', ')} for ${code(name)}...`,
                    tooLong: (name: string, max: number) =>
                        `Yeah, buddy. Not gonna work. Make sure the ${code(name)} ain't longer ${bold(max)} characters.`,
                    tooShort: (name: string, min: number) =>
                        `Why so short? Make sure the ${code(name)} is at least ${bold(min)} characters.`,
                },
                numbers: {
                    tooHigh: (name: string, max: number) =>
                        `You gotta be kidding me. The ${code(name)} can't be higher than ${bold(max)}.`,
                    tooLow: (name: string, min: number) =>
                        `You gotta be kidding me. The ${code(name)} can't be lower than ${bold(min)}.`,
                },
            },
            placeholder: {
                description: chalkTemplate`{italic (I have no idea what this command does)}`,
            },
        },
    },
} as const satisfies Strings

let current: any
let tracer: string[] = []

export const s = new Proxy(STRINGS, {
    get: (target, prop: string) => {
        current ??= target

        current = current[prop]
        tracer.push(prop)

        if (current == null || (typeof current === 'object' && !Array.isArray(current))) return s

        const val = current
        current = undefined
        tracer = []

        return val
    },
})

type NeverCoalesce<T, Y> = [T] extends [never] ? Y : T

export interface StringDict {
    [key: string]: Stringifiable | RandomizableStringifiable | StringDict
}

export type StringifableDynamic = (...args: any[]) => string
export type Stringifiable = string | StringifableDynamic
export type RandomizableStringifiable = Array<Stringifiable>

const LogTag = 'strings'

export function string<S extends Stringifiable | RandomizableStringifiable>(
    stringifiable: S,
    ...args: S extends RandomizableStringifiable
        ? NeverCoalesce<Parameters<Extract<S[number], StringifableDynamic>>, []>
        : S extends StringifableDynamic
          ? Parameters<S>
          : []
): string {
    if (Array.isArray(stringifiable))
        // @ts-expect-error
        stringifiable = stringifiable[Math.floor(Math.random() * stringifiable.length)]!
    if (typeof stringifiable === 'string') return stringifiable
    if (typeof stringifiable === 'function') return stringifiable(...args)

    const path = tracer.join('.')

    const invalid = (stringifiable as unknown as S | typeof s) === s
    if (invalid) tracer = []

    log.trace(LogTag, invalid ? 'String path invalid:' : 'String path not stringifiable:', path)
    return path
}
