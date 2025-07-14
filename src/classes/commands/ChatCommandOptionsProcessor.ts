import assert from 'assert'
import { distance } from 'fastest-levenshtein'
import {
    type ApplicationCommandOptionsAttachment,
    type ApplicationCommandOptionsBoolean,
    type ApplicationCommandOptionsChannel,
    type ApplicationCommandOptionsInteger,
    type ApplicationCommandOptionsNumber,
    type ApplicationCommandOptionsRole,
    type ApplicationCommandOptionsString,
    type ApplicationCommandOptionsSubCommand,
    type ApplicationCommandOptionsSubCommandGroup,
    type ApplicationCommandOptionsUser,
    ApplicationCommandOptionTypes,
    type CommandInteraction,
    type Message,
    type Role,
    type User,
    WrapperError,
} from 'oceanic.js'
import { log } from '~/context'
import { s, string } from '~/strings'
import { getChannel, isTextableChannel, type TextableChannel } from '~/utils/channels'
import { getGuild } from '~/utils/guilds'
import { getMessage, getMessageReference } from '~/utils/messages'
import { getUser } from '~/utils/users'
import { UserError, UserErrorType } from '../Error'
import {
    ChatCommand,
    type ChatCommandOptions,
    type ChatCommandOptionsMessage,
    type ChatCommandOptionsStringWithGreedy,
    type ChatCommandOptionsStringWithResolver,
    type ChatCommandOptionsSubCommand,
    type ChatCommandOptionsSubCommandGroup,
    type ChatCommandOptionsToExecuteOptionsDict,
    type ChatCommandOptionsUser,
    type ChatCommandOptionTypeToOptionValue,
} from './ChatCommand'
import { ChatCommandOptionsWithReadMessageReferenceMode, ChatCommandOptionTypes } from './ChatCommandConstants'

const AnyIdRegex = /^\d+$/

export async function optionsFromInteraction<Options extends ChatCommandOptions[]>(
    intr: CommandInteraction,
    options: Options,
): Promise<ChatCommandOptionsToExecuteOptionsDict<Options>> {
    const { options: wrapper } = intr.data
    const opts: Record<string, any> = {}

    for (const opt of options)
        try {
            switch (opt.type) {
                case ApplicationCommandOptionTypes.SUB_COMMAND:
                case ApplicationCommandOptionTypes.SUB_COMMAND_GROUP: {
                    const { options } = opt
                    // This is fine, as we only have at max two levels of nesting
                    if (options) opts[opt.name] = await ChatCommand.optionsFromInteraction(intr, options)
                    else opts[opt.name] = true // No options, just a flag
                    break
                }
                case ApplicationCommandOptionTypes.STRING: {
                    const arg = wrapper.getString(opt.name, opt.required as true)
                    if (arg) opts[opt.name] = arg
                    break
                }
                case ApplicationCommandOptionTypes.INTEGER: {
                    const arg = wrapper.getInteger(opt.name, opt.required as true)
                    if (arg) opts[opt.name] = arg
                    break
                }
                case ApplicationCommandOptionTypes.NUMBER: {
                    const arg = wrapper.getNumber(opt.name, opt.required as true)
                    if (arg) opts[opt.name] = arg
                    break
                }
                case ApplicationCommandOptionTypes.BOOLEAN: {
                    const arg = wrapper.getBoolean(opt.name, opt.required as true)
                    if (arg) opts[opt.name] = arg
                    break
                }
                case ApplicationCommandOptionTypes.CHANNEL: {
                    const arg = wrapper.getChannel(opt.name, opt.required as true)
                    if (arg) opts[opt.name] = arg
                    break
                }
                case ApplicationCommandOptionTypes.USER: {
                    const arg = wrapper.getUser(opt.name, opt.required as true)
                    if (arg) opts[opt.name] = arg
                    break
                }
                case ChatCommandOptionTypes.MESSAGE: {
                    const arg = wrapper.getString(opt.name, opt.required as true)
                    const type = string(s.generic.command.option[opt.type])

                    if (AnyIdRegex.test(arg)) {
                        const message = await getMessage(intr.channel as TextableChannel, arg)
                        if (!message)
                            throw new UserError(string(s.generic.command.error.validator.notExists, opt.name, type))

                        opts[opt.name] = message
                        break
                    }

                    throw new UserError(string(s.generic.command.error.validator.invalid, opt.name, type))
                }
                case ApplicationCommandOptionTypes.ROLE: {
                    const arg = wrapper.getRole(opt.name, opt.required as true)
                    if (arg) opts[opt.name] = arg
                    break
                }
                case ApplicationCommandOptionTypes.ATTACHMENT: {
                    const arg = wrapper.getAttachment(opt.name, opt.required as true)
                    if (arg) opts[opt.name] = arg
                    break
                }
                default:
                    throw new Error(`Unsupported option type '${opt.type}'`)
            }
        } catch (err) {
            if (err instanceof WrapperError) throw new UserError(string(s.error.generic))
        }

    // @ts-expect-error
    return opts
}

const CommandArgumentSplitter = ' '

const MaxRoleNameMatchDistance = 3
const MaxUserNameMatchDistance = 1

const BoolFalse = new Set(['false', '0', 'no', 'n', 'off', 'f'])
const BoolTrue = new Set(['true', '1', 'yes', 'y', 'on', 't'])

const RoleRegex = /^(?:<@&)?(\d+)(?:>)?$/
const UserRegex = /^(?:<@)?(\d+)(?:>)?$/
const ChannelRegex = /^(?:<#)?(\d+)(?:>)?$/

const Errors = {
    Missing: 1 << 0,
    Invalid: 1 << 1,
    NotExists: 1 << 2,
    BadChoice: 1 << 3,
}

interface Context {
    /** @see {@link Errors} */
    err: number
    msg: Message
    parser: Generator<string, undefined, string>
    get: () => string | undefined
    arg: string | undefined
    opts: Record<string, any>
}

interface Confirmation<T extends ApplicationCommandOptionTypes | ChatCommandOptionTypes> {
    name: string
    type: T
    value: ChatCommandOptionTypeToOptionValue[T]
}

// TODO: return [Options, Confirmations[]]
export async function optionsFromMessage<Options extends ChatCommandOptions[]>(
    msg: Message,
    parser: Generator<string, undefined, string>,
    options: Options,
): Promise<ChatCommandOptionsToExecuteOptionsDict<Options>> {
    const opts: Record<string, any> = {}

    const getArgument = () => {
        if (ctx.arg) {
            const val = ctx.arg
            ctx.arg = undefined
            return val
        }

        return parser.next().value
    }

    const ctx: Context = {
        err: 0,
        get: getArgument,
        msg,
        opts,
        parser,
        arg: undefined,
    }

    loop: for (let i = 0; i < options.length; i++) {
        // Reset errors for each option
        ctx.err = 0

        const opt = options[i]!

        switch (opt.type) {
            case ApplicationCommandOptionTypes.SUB_COMMAND:
            case ApplicationCommandOptionTypes.SUB_COMMAND_GROUP: {
                await handleSubCommandLikeOption(opt, ctx)
                // If there's an error, we need the next option to process the argument instead
                if (ctx.err) break
                break loop
            }

            case ApplicationCommandOptionTypes.STRING: {
                await handleStringOption(opt, ctx, options.length, i)
                break
            }

            case ApplicationCommandOptionTypes.NUMBER:
            case ApplicationCommandOptionTypes.INTEGER: {
                handleNumberLikeOption(opt, ctx)
                break
            }

            case ApplicationCommandOptionTypes.BOOLEAN: {
                handleBooleanOption(opt, ctx)
                break
            }

            case ApplicationCommandOptionTypes.CHANNEL: {
                await handleChannelOption(opt, ctx)
                break
            }

            case ApplicationCommandOptionTypes.USER: {
                await handleUserOption(opt, ctx)
                break
            }

            case ChatCommandOptionTypes.MESSAGE: {
                await handleMessageOption(opt, ctx)
                break
            }

            case ApplicationCommandOptionTypes.ROLE: {
                await handleRoleOption(opt, ctx)
                break
            }

            case ApplicationCommandOptionTypes.ATTACHMENT: {
                await handleAttachmentOption(opt, ctx)
                break
            }

            default:
                throw new Error(`Unsupported option type '${opt.type}'`)
        }

        // An error occured while processing the option
        // But if ctx.arg is set, it means that we want to allow the next option to process this argument instead
        if (ctx.err && !ctx.arg) {
            handleOptionError(ctx.err, opt, options)
            // Above must throw a UserError, but if it somehow doesn't, we throw a generic error
            throw new Error(`Error processing option '${opt.name}' with error ${ctx.err}`)
        }
    }

    // Argument was not accepted by the last option
    // But we ran out of options to process it
    if (ctx.arg) {
        const opt = options.at(-1)!

        switch (opt.type) {
            case ApplicationCommandOptionTypes.SUB_COMMAND:
            case ApplicationCommandOptionTypes.SUB_COMMAND_GROUP:
                throw new UserError(
                    string(
                        s.generic.command.error.validator.subcommands.invalid,
                        ctx.arg!,
                        options.map(it => it.name),
                    ),
                    UserErrorType.Usage,
                )

            default:
                handleOptionError(ctx.err || Errors.Invalid, opt, options)
                // Above must throw a UserError, but if it somehow doesn't, we throw a generic error
                throw new Error(`Last option '${opt.name}' did not accept the argument '${ctx.arg}'`)
        }
    }

    // @ts-expect-error
    return opts
}

function handleOptionError(err: number, opt: ChatCommandOptions, options: ChatCommandOptions[]) {
    const type = string(s.generic.command.option[opt.type])

    if (err & Errors.Missing) {
        if (
            opt.type === ApplicationCommandOptionTypes.SUB_COMMAND ||
            opt.type === ApplicationCommandOptionTypes.SUB_COMMAND_GROUP
        )
            throw new UserError(
                string(
                    s.generic.command.error.validator.subcommands.missing,
                    options.map(it => it.name),
                ),
                UserErrorType.Usage,
            )

        throw new UserError(string(s.generic.command.error.validator.missing, opt.name, type), UserErrorType.Usage)
    }

    if (err & Errors.Invalid)
        throw new UserError(string(s.generic.command.error.validator.invalid, opt.name, type), UserErrorType.Usage)

    if (err & Errors.BadChoice)
        if (opt.type === ApplicationCommandOptionTypes.STRING && opt.choices)
            throw new UserError(
                string(
                    s.generic.command.error.validator.strings.choice,
                    opt.name,
                    opt.choices.map(it => it.name),
                ),
                UserErrorType.Usage,
            )

    if (err & Errors.NotExists)
        throw new UserError(string(s.generic.command.error.validator.notExists, opt.name, type), UserErrorType.Usage)
}

async function handleSubCommandLikeOption(
    opt:
        | ApplicationCommandOptionsSubCommand
        | ApplicationCommandOptionsSubCommandGroup
        | ChatCommandOptionsSubCommand
        | ChatCommandOptionsSubCommandGroup,
    ctx: Context,
) {
    const { msg, parser, opts, get } = ctx
    const { name, options } = opt

    const arg = get()
    if (!arg) {
        ctx.err = Errors.Missing
        return
    }

    if (arg === name || (opt as ChatCommandOptionsSubCommand | ChatCommandOptionsSubCommandGroup).aliases?.has(arg)) {
        // This is fine, as we only have at max two levels of nesting
        if (options) opts[name] = await optionsFromMessage(msg, parser, options)
        else opts[name] = true // No options, just a flag

        return
    }

    // Allow the next subcommand option to process this argument instead
    ctx.arg = arg
    ctx.err = Errors.BadChoice
}

async function handleStringOption(
    opt:
        | ApplicationCommandOptionsString
        | ChatCommandOptionsStringWithGreedy
        | ChatCommandOptionsStringWithResolver<any>,
    ctx: Context,
    totalOptions: number,
    i: number,
) {
    const { parser, opts, get } = ctx

    let arg = get()
    // Allow empty strings, so when the user passes `command ""` it will be treated as an valid argument
    if (arg === undefined) {
        if (opt.required) ctx.err = Errors.Missing
        return
    }

    if (opt.choices) {
        const choice = opt.choices.find(it => it.name === arg)
        if (!choice) {
            ctx.err = Errors.BadChoice
            // Allow the next option to process this argument instead
            ctx.arg = arg
            return
        }

        arg = choice.value
    } else {
        if (opt.minLength && arg.length < opt.minLength)
            throw new UserError(
                string(s.generic.command.error.validator.strings.small, opt.name, opt.minLength),
                UserErrorType.Usage,
            )

        if (opt.maxLength && arg.length > opt.maxLength)
            throw new UserError(
                string(s.generic.command.error.validator.strings.large, opt.name, opt.maxLength),
                UserErrorType.Usage,
            )
    }

    if ((opt as ChatCommandOptionsStringWithGreedy).greedy) {
        if (i === totalOptions - 1)
            while (true) {
                const next = parser.next().value
                if (!next) break
                arg += `${CommandArgumentSplitter}${next}`
            }
        else
            log.warn(
                `${ChatCommand.name}#${ChatCommand.optionsFromMessage.name}`,
                `String option (${opt.name}) with greedy enabled is not the last option in the command`,
            )
    }

    const resolver = (opt as ChatCommandOptionsStringWithResolver<any>).resolver
    if (resolver) {
        let skip = false
        arg = await resolver(arg, () => {
            ctx.arg = arg
            skip = true
        })

        if (skip) return
    }

    if (arg !== undefined) opts[opt.name] = arg
}

function handleNumberLikeOption(opt: ApplicationCommandOptionsNumber | ApplicationCommandOptionsInteger, ctx: Context) {
    const { opts, get } = ctx

    const arg = get()
    if (!arg) {
        if (opt.required) ctx.err = Errors.Missing
        return
    }

    const val = Number(arg)

    if (Number.isNaN(val) || (opt.type === ApplicationCommandOptionTypes.INTEGER && !Number.isInteger(val))) {
        ctx.err = Errors.Invalid
        // Allow the next option to process this argument instead
        ctx.arg = arg
        return
    }

    if (opt.minValue !== undefined && val < opt.minValue)
        throw new UserError(
            string(s.generic.command.error.validator.numbers.small, opt.name, opt.minValue),
            UserErrorType.Usage,
        )

    if (opt.maxValue !== undefined && val > opt.maxValue)
        throw new UserError(
            string(s.generic.command.error.validator.numbers.large, opt.name, opt.maxValue),
            UserErrorType.Usage,
        )

    if (opt.choices) {
        const choice = opt.choices.find(it => it.value === val)
        if (!choice) {
            ctx.err = Errors.BadChoice
            return
        }
    }

    opts[opt.name] = val
}

function handleBooleanOption({ name, required }: ApplicationCommandOptionsBoolean, ctx: Context) {
    const { opts, get } = ctx

    const arg = get()
    if (!arg) {
        if (required) ctx.err = Errors.Missing
        return
    }

    const val = arg.toLowerCase()

    if (BoolTrue.has(val)) opts[name] = true
    else if (BoolFalse.has(val)) opts[name] = false
    else ctx.err = Errors.Invalid
}

async function handleChannelOption(opt: ApplicationCommandOptionsChannel, ctx: Context) {
    const { opts, get } = ctx

    const arg = get()
    if (!arg) {
        if (opt.required) ctx.err = Errors.Missing
        return
    }

    const parsed = arg.match(ChannelRegex)
    if (!parsed) {
        ctx.err = Errors.Invalid
        // Allow the next option to process this argument instead
        ctx.arg = arg
        return
    }

    const channel = await getChannel(parsed[1]!)
    if (channel) {
        opts[opt.name] = channel
        return
    }

    ctx.err = Errors.NotExists
}

async function handleUserOption(opt: ApplicationCommandOptionsUser | ChatCommandOptionsUser, ctx: Context) {
    const { opts, get, msg } = ctx

    const arg = get()

    const rMRMode = (opt as ChatCommandOptionsUser).readMessageReference

    if (rMRMode && msg.messageReference) {
        const prioritize = rMRMode === ChatCommandOptionsWithReadMessageReferenceMode.Prioritize
        if (prioritize && arg) ctx.arg = arg
        if (prioritize || !arg) opts[opt.name] = await getMessageReference(msg).then(it => it!.author)
        return
    }

    if (!arg) {
        if (opt.required) ctx.err = Errors.Missing
        return
    }

    let user: User | null = null

    const parsed = arg.match(UserRegex)
    if (parsed) user = await getUser(parsed[1]!)

    if (!user && msg.guildID) {
        const guild = await getGuild(msg.guildID)
        assert(guild, 'Guild not available')

        const {
            members: [member],
        } = await guild.memberSearch({
            orQuery: {
                usernames: {
                    orQuery: [arg],
                },
            },
            limit: 1,
        })

        if (!member) {
            ctx.err = Errors.NotExists
            return
        }

        if (distance(arg, member.member.user.username) <= MaxUserNameMatchDistance) {
            user = member.member.user
            return
        }
    }

    if (user) {
        opts[opt.name] = user
        return
    }

    ctx.err = Errors.NotExists
}

async function handleMessageOption(opt: ChatCommandOptionsMessage, ctx: Context) {
    const { opts, get, msg } = ctx

    const arg = get()

    const rMRMode = opt.readMessageReference

    if (rMRMode && msg.messageReference) {
        const prioritize = rMRMode === ChatCommandOptionsWithReadMessageReferenceMode.Prioritize
        if (prioritize && arg) ctx.arg = arg
        if (prioritize || !arg) opts[opt.name] = await getMessageReference(msg)
        return
    }

    if (!arg) {
        if (opt.required) ctx.err = Errors.Missing
        return
    }

    if (!AnyIdRegex.test(arg)) {
        ctx.err = Errors.Invalid
        // Allow the next option to process this argument instead
        ctx.arg = arg
        return
    }

    const channel = await getChannel(msg.channelID)
    assert(channel && isTextableChannel(channel), 'Channel not found or is a non-textable channel')

    const val = await getMessage(channel, arg)
    if (val) {
        opts[opt.name] = val
        return
    }

    ctx.err = Errors.NotExists
}

async function handleRoleOption(opt: ApplicationCommandOptionsRole, ctx: Context) {
    const { opts, get, msg } = ctx

    const arg = get()

    assert(msg.guildID, 'Guild ID is not available')
    const guild = await getGuild(msg.guildID)
    assert(guild, 'Guild not available')

    if (!arg) {
        if (opt.required) ctx.err = Errors.Missing
        return
    }

    let role: Role | undefined
    const { roles } = guild

    const parsed = arg.match(RoleRegex)
    if (parsed) role = roles.get(parsed[1]!)
    // If we didn't find the role by ID, try to find it by name
    if (!role) {
        const query = arg.toLowerCase()
        let lowestDist = Number.POSITIVE_INFINITY

        for (const r of roles.values()) {
            const dist = distance(query, r.name.toLowerCase())

            // Case insensitive match
            if (!dist) {
                // Exact match
                if (r.name === arg) {
                    role = r
                    break
                }

                lowestDist = MaxRoleNameMatchDistance
                continue
            }

            if (dist > MaxRoleNameMatchDistance) continue

            if (dist < lowestDist) {
                lowestDist = dist
                role = r
            }
        }
    }

    if (role) {
        opts[opt.name] = role
        return
    }

    ctx.err = Errors.NotExists
}

async function handleAttachmentOption(opt: ApplicationCommandOptionsAttachment, ctx: Context) {
    const { opts, msg } = ctx

    const attachment = msg.attachments.first()
    if (!attachment) {
        if (opt.required) ctx.err = Errors.Missing
        return
    }

    opts[opt.name] = attachment
}
