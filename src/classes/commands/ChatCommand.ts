import {
    type AnyTextableChannel,
    type AnyTextableGuildChannel,
    type ApplicationCommandOptionBase,
    type ApplicationCommandOptions,
    type ApplicationCommandOptionsString,
    type ApplicationCommandOptionsSubCommand,
    type ApplicationCommandOptionsSubCommandGroup,
    type ApplicationCommandOptionsUser,
    ApplicationCommandOptionTypes,
    ApplicationCommandTypes,
    type Attachment,
    type Channel,
    CommandInteraction,
    type CreateChatInputApplicationCommandOptions,
    type CreateMessageOptions,
    type InteractionContent,
    type InteractionContextTypes,
    type Message,
    type Role,
    type Uncached,
    type User,
} from 'oceanic.js'
import { inspect } from 'util'
import { bot, log } from '~/context'
import { getMember } from '~/utils/guilds'
import { type ChatCommandOptionsWithReadMessageReferenceMode, ChatCommandOptionTypes } from './ChatCommandConstants'
import {
    Command,
    type CommandAccess,
    CommandAccessMatchMode,
    type CommandContexts,
    type CommandTriggers,
    type CreateCommandOptions,
} from './Command'

// Needed to fix circular dependency issues
const { optionsFromInteraction, optionsFromMessage } = await import('./ChatCommandOptionsProcessor')

export class ChatCommand<
    const Triggers extends BitFlagDictValue<typeof CommandTriggers>,
    const Contexts extends InteractionContextTypes[],
    const Options extends ChatCommandOptions[],
    const ExecuteContext extends ChatCommandExecuteContext<ContextBasedOnTriggersAndContexts<Triggers, Contexts>>,
> extends Command<Triggers, Contexts> {
    declare access?: ChatCommandAccess<ExecuteContext>
    options: Options
    execute: ChatCommandExecuteFunction<Options, ExecuteContext>

    constructor(options: CreateChatCommandOptions<Triggers, Contexts, Options, ExecuteContext>) {
        super(options)

        this.options = options.options
        this.execute = options.execute
    }

    static toApplicationCommand(cmd: AnyChatCommand): CreateChatInputApplicationCommandOptions {
        return {
            ...Command.toApplicationCommand(cmd),
            description: cmd.description,
            options: optionsToAppCommandOptions(cmd.options),
            type: ApplicationCommandTypes.CHAT_INPUT,
        }
    }

    static async canExecute(
        { name, access }: AnyChatCommand,
        context: ChatCommandExecuteContext<any>,
    ): Promise<boolean> {
        if (!access) return true

        const { match: mode } = access
        const not = Boolean(mode & CommandAccessMatchMode.Negate)
        const and = mode & CommandAccessMatchMode.All
        const or = mode & CommandAccessMatchMode.Some

        let noChecks = true
        for await (const check of createAccessChecks(context, access)) {
            noChecks = false
            if (check) {
                if (or) return !not
            } else if (and) return not
        }

        if (noChecks) {
            log.trace(
                `${ChatCommand.name}#${ChatCommand.canExecute.name}`,
                `No checks were yielded for command '${name}' with context: ${inspect(context)}`,
            )

            return false
        }

        // If we got here, it means we didn't return early from the checks, this means we need to return the opposite of what's in the checks loop:
        // with or === true: None of the checks passed
        // with and === true: All checks passed
        // Other cases will not be handled (return false), because it's simply not possible to reach them
        return or ? not : and ? !not : false
    }

    static createExecuteActions(trigger: CommandInteraction | Message): ChatCommandExecuteActions {
        return {
            reply(content) {
                if (trigger instanceof CommandInteraction) return trigger.reply(content).then(it => it.getMessage())

                const cnt = content as CreateMessageOptions

                cnt.messageReference = {
                    messageID: trigger.id,
                    failIfNotExists: true,
                }

                return bot.rest.channels.createMessage(trigger.channelID, cnt)
            },
        }
    }

    static optionsFromMessage = optionsFromMessage
    static optionsFromInteraction = optionsFromInteraction
}

function optionsToAppCommandOptions(options: ChatCommandOptions[]): ApplicationCommandOptions[] {
    const opts: ApplicationCommandOptions[] = []
    for (const opt of options)
        switch (opt.type) {
            case ApplicationCommandOptionTypes.SUB_COMMAND:
            case ApplicationCommandOptionTypes.SUB_COMMAND_GROUP: {
                if (opt.options)
                    opts.push({
                        ...opt,
                        // This is fine, as we only have at max two levels of nesting
                        options: optionsToAppCommandOptions(opt.options) as Exclude<
                            ApplicationCommandOptions,
                            {
                                type:
                                    | ApplicationCommandOptionTypes.SUB_COMMAND
                                    | ApplicationCommandOptionTypes.SUB_COMMAND_GROUP
                            }
                        >[],
                    })
                else opts.push(opt as ApplicationCommandOptions)
                break
            }

            case ChatCommandOptionTypes.MESSAGE: {
                opts.push({
                    ...opt,
                    type: ApplicationCommandOptionTypes.STRING,
                })

                break
            }

            default:
                opts.push(opt)
        }

    return opts
}

// TODO: Check channel permission overrides
async function* createAccessChecks(
    context: ChatCommandExecuteContext,
    { channels, guilds, permissions, roles, users, predicate }: ChatCommandAccess<ChatCommandExecuteContext<any>>,
) {
    const {
        executor,
        trigger: { channelID, guildID },
    } = context

    if (predicate) yield await predicate(context)
    if (users) yield users.includes(executor.id)
    if (channels) yield channels.includes(channelID)

    if (guildID) {
        if (guilds) yield guilds.includes(guildID)

        const member = await getMember(guildID, executor.id)
        if (member) {
            if (permissions !== undefined) yield member.permissions.has(permissions)
            if (roles) yield roles.some(role => member.roles.includes(role))
        } else yield false
    }
}

type ContextsToChannelType<Contexts extends InteractionContextTypes[]> =
    ArrayElement<Contexts> extends InteractionContextTypes.GUILD
        ? AnyTextableGuildChannel
        : AnyTextableChannel | Uncached

type ContextBasedOnTriggersAndContexts<
    Triggers extends BitFlagDictValue<typeof CommandTriggers>,
    Contexts extends InteractionContextTypes[],
    _ChannelType extends AnyTextableChannel | AnyTextableGuildChannel | Uncached = ContextsToChannelType<Contexts>,
> = Triggers extends typeof CommandTriggers.PlatformImplementation
    ? CommandInteraction<_ChannelType>
    : Triggers extends typeof CommandTriggers.ChatMessage
      ? Message<_ChannelType>
      : CommandInteraction<_ChannelType> | Message<_ChannelType>

export type AnyChatCommand = ChatCommand<
    CommandTriggers,
    CommandContexts,
    ChatCommandOptions[],
    ChatCommandExecuteContext<ContextBasedOnTriggersAndContexts<CommandTriggers, CommandContexts>>
>

export interface CreateChatCommandOptions<
    Triggers extends BitFlagDictValue<typeof CommandTriggers>,
    Contexts extends InteractionContextTypes[],
    Options extends ChatCommandOptions[],
    ExecuteContext extends ChatCommandExecuteContext,
> extends CreateCommandOptions<Triggers, Contexts> {
    name: string
    description: string
    /**
     * Aliases for the command, for {@link CommandTriggers.ChatMessage} commands.
     */
    aliases?: string[]
    options: Options
    /**
     * Extra requirement checks before executing the command.
     * @see {@link ChatCommandAccess}
     */
    access?: ChatCommandAccess<ExecuteContext>

    execute: ChatCommandExecuteFunction<Options, ExecuteContext>
}

export type ChatCommandOptionsStringWithResolver<T> = ApplicationCommandOptionsString & {
    /**
     * A function that will be called with the string value of this option.
     *
     * Call `pass()` to pass the value to the next option.
     */
    resolver: (value: string, pass: () => void) => T | Promise<T>
}

export type ChatCommandOptionTypeToOptionValue = {
    [ApplicationCommandOptionTypes.STRING]: string
    [ApplicationCommandOptionTypes.INTEGER]: number
    [ApplicationCommandOptionTypes.NUMBER]: number
    [ApplicationCommandOptionTypes.BOOLEAN]: boolean
    [ApplicationCommandOptionTypes.CHANNEL]: Channel
    [ApplicationCommandOptionTypes.USER]: User
    [ApplicationCommandOptionTypes.ATTACHMENT]: Attachment
    [ApplicationCommandOptionTypes.ROLE]: Role
    [ChatCommandOptionTypes.MESSAGE]: Message
    // This is never used, but we need to define it to avoid TS errors
    [ApplicationCommandOptionTypes.SUB_COMMAND]: never
    [ApplicationCommandOptionTypes.SUB_COMMAND_GROUP]: never
    [ApplicationCommandOptionTypes.MENTIONABLE]: never
}

export type ChatCommandExecuteFunction<
    Options extends ChatCommandOptions[],
    ExecuteContext extends ChatCommandExecuteContext,
> = (
    context: ExecuteContext,
    options: ChatCommandOptionsToExecuteOptionsDict<Options>,
    actions: CommandActions,
) => Promise<unknown> | unknown

export interface CommandActions {
    reply(content: CreateMessageOptions | InteractionContent): Promise<Message>
}

export interface ChatCommandExecuteContext<
    Trigger extends CommandInteraction | Message = CommandInteraction | Message,
> {
    /**
     * The trigger that executed the command.
     */
    trigger: Trigger
    /**
     * The user that executed the command.
     */
    executor: User
}

export type ChatCommandOptionsToExecuteOptionsDict<Options extends ChatCommandOptions[]> = {
    [Key in Options[number] as Key['name']]: UndefinedIfNotRequired<
        Key,
        Key extends ApplicationCommandOptionsSubCommand | ApplicationCommandOptionsSubCommandGroup
            ? Key['options'] extends ChatCommandOptions[]
                ? ChatCommandOptionsToExecuteOptionsDict<Key['options']>
                : true
            : Key extends ChatCommandOptionsStringWithResolver<infer R>
              ? R
              : ChatCommandOptionTypeToOptionValue[Key['type']]
    >
}

type UndefinedIfNotRequired<T extends { required?: boolean }, U> = T['required'] extends true ? U : U | undefined

export interface ChatCommandOptionsWithReadMessageReference {
    /**
     * Whether the message reference should be used to get the user.
     *
     * @see {@link ChatCommandOptionsWithReadMessageReferenceMode}
     *
     * @example
     * ```
     * // AnnoyingUser: shut up
     * // |
     * // Palm: j!ban
     * // Jasper: Banned **AnnoyingUser**
     * ```
     */
    readMessageReference: (typeof ChatCommandOptionsWithReadMessageReferenceMode)[keyof typeof ChatCommandOptionsWithReadMessageReferenceMode]
}

export interface ChatCommandOptionsMessage
    extends Omit<ApplicationCommandOptionBase, 'type'>,
        Partial<ChatCommandOptionsWithReadMessageReference> {
    type: ChatCommandOptionTypes.MESSAGE
}

export interface ChatCommandOptionsUser
    extends ApplicationCommandOptionsUser,
        ChatCommandOptionsWithReadMessageReference {}

export type ChatCommandOptionsStringWithGreedy = ApplicationCommandOptionsString & {
    /**
     * If this command was triggered by {@link CommandTriggers.ChatMessage} and is the last option,
     * whether to consume the rest of the message content as the value of this option.
     */
    greedy: true
}

export interface ChatCommandOptionsSubCommand extends Omit<ApplicationCommandOptionsSubCommand, 'options'> {
    options?: ChatCommandOptions[]
    /**
     * The aliases for the subcommand, for {@link CommandTriggers.ChatMessage} commands.
     */
    aliases?: Set<string>
}

export interface ChatCommandOptionsSubCommandGroup extends Omit<ApplicationCommandOptionsSubCommandGroup, 'options'> {
    options?: ChatCommandOptions[]
    /**
     * The aliases for the subcommand group, for {@link CommandTriggers.ChatMessage} commands.
     */
    aliases?: Set<string>
}

export type ChatCommandOptions =
    | Exclude<ApplicationCommandOptions, ApplicationCommandOptionsSubCommand | ApplicationCommandOptionsSubCommandGroup>
    | ChatCommandOptionsUser
    | ChatCommandOptionsStringWithGreedy
    | ChatCommandOptionsStringWithResolver<any>
    | ChatCommandOptionsSubCommand
    | ChatCommandOptionsSubCommandGroup
    | ChatCommandOptionsMessage

export interface ChatCommandAccess<ExecuteContext extends ChatCommandExecuteContext = ChatCommandExecuteContext>
    extends CommandAccess {
    /**
     * The predicate. Set {@link CommandAccess.match} to {@link CommandAccessMatchMode.All} to use this in combination with the other checks.
     */
    predicate?: (context: ExecuteContext) => boolean | Promise<boolean>
}

export interface ChatCommandExecuteActions {
    /**
     * Reply to the command with a message.
     * @param content The content to send.
     */
    reply(content: CreateMessageOptions | InteractionContent): Promise<Message>
}
