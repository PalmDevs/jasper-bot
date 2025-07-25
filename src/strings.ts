import chalkTemplate from 'chalk-template'
import { ApplicationCommandOptionTypes } from 'oceanic.js'
import { ChatCommandOptionTypes } from './classes/commands/ChatCommandConstants'
import { Emojis } from './constants'
import { log } from './context'
import { bold, code, codeblock, emoji, subtext } from './utils/formatters'

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
        ban: {
            action: (tag: string) => `Banned ${tag}`,
        },
        is: {
            action: [
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
            actionConfirm: [
                'As I said, probably.',
                "It's whatever, like I said.",
                'Yeah, probably.',
                'I said sure.',
                'Mhm, yeah.',
                'I guess?',
                'I guess?',
                'Sure, yeah, sure.',
                "Whatever, I don't care.",
                "Whatever, I don't care.",
                'Mhm.',
                // Neutral
                "I don't care.",
                "Ask again later! I'm busy!",
                'Do I look like I know, or care?',
                'Flip a coin or something.',
                'Do I look like I know!?',
                "Again, stupid question. Not answerin' that.",
                'Go ask the magic 8-ball.',
                "Yes, I'm quite sure.",
                "Again, not answerin' that.",
                'Oh fuck off.',
                (question: string) => `What do you mean? "${question}"`,
                // Negative
                'I said definitely not!',
                'Totally, yeah, totally...',
                'Again, if you want to lose all your money, sure.',
                'Mhm, no.',
                "Yeah, what's wrong with doubting?",
                'Again, tough luck.',
                'Yeah, no.',
                'Mhm.',
                'Yeah, absolutely not.',
                'I mean, keep wishing.',
                'As I said, if you want to lose all your money, sure.',
            ],
        },
        eval: {
            outputTooLarge: '(Output too large, file uploaded)',
            outputFileName: 'eval-output.txt',
        },
        hello: {
            action: [
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
        mute: {
            action: (tag: string) => `Muted ${tag}`,
            reason: {
                accountTooNew: (timestampSecs: number) =>
                    `Account too new. Created <t:${timestampSecs}> (<t:${timestampSecs}:R>)`,
            },
        },
        nick: {
            action: (tag: string) => `Set nickname for ${tag}`,
            reset: subtext('(Reset nickname)'),
        },
        note: {
            error: {
                noConfig: (guildName: string) => `No notes configured for ${guildName}.`,
                noNote: 'Note not found. Run without any options to see all notes in this server.',
            },
            allTitle: (guildName: string) => `Notes in ${guildName}`,
            all: (notes: string[]) => `${notes.map(code).join(', ')}`,
        },
        purge: {
            action: (amount: number) => `Purged ${amount} messages`,
        },
        register: {
            info: (count: number) => `Registering ${count} commands:`,
            action: 'Slash commands registered successfully.',
        },
        reply: {
            action: 'Fine.',
        },
        role: {
            reason: (tag: string, id: string) => `via command by ${tag} (${id})`,
            action: {
                added: 'Added role',
                removed: 'Removed role',
            },
        },
        slowmode: {
            action: (duration: string) => `Set slowmode for ${duration}`,
        },
        stop: {
            action: 'Thanks, I can finally go back to doing a bunch of nothing properly.',
        },
        unmute: {
            action: (tag: string) => `Unmuted ${tag}`,
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
        before: 'Before',
        nickname: 'Nickname',
        result: 'Result',
        duration: 'Duration',
        command: {
            default: {
                reason: '(No reason provided)',
            },
            error: {
                user: {
                    notManageable: (mention: string) =>
                        `Can't do that to ${mention}. I don't exactly want to get demoted, you know?`,
                    notInGuild: (mention: string) => `Did ${mention} just leave? Guess they couldn't handle the heat.`,
                },
                duration: {
                    invalid: (arg: string) => `I don\'t know how long ${code(arg)} is. Pass me a normal duration.`,
                    bad: (min?: string, max?: string) => {
                        let str = "Can't set a timer for that duration."
                        if (min !== undefined && max !== undefined)
                            str += ` Pass me something between ${bold(min)} and ${bold(max)}.`
                        else if (min !== undefined) str += ` Pass me something longer than ${bold(min)}.`
                        else if (max !== undefined) str += ` Pass me something shorter than ${bold(max)}.`
                        return str
                    },
                },
                validator: {
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
                        choice: (name: string, choices: string[]) =>
                            `You can only pass ${choices.map(code).join(', ')} for ${code(name)}...`,
                        large: (name: string, max: number) =>
                            `Yeah, buddy. Not gonna work. Make sure the ${code(name)} ain't longer ${bold(max)} characters.`,
                        small: (name: string, min: number) =>
                            `Why so short? Make sure the ${code(name)} is at least ${bold(min)} characters.`,
                    },
                    numbers: {
                        large: (name: string, max: number) =>
                            `You gotta be kidding me. The ${code(name)} can't be higher than ${bold(max)}.`,
                        small: (name: string, min: number) =>
                            `You gotta be kidding me. The ${code(name)} can't be lower than ${bold(min)}.`,
                    },
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
