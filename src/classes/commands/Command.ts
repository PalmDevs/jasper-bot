import { ApplicationIntegrationTypes, type CreateApplicationCommandOptions, InteractionContextTypes } from 'oceanic.js'

export type AnyCommand = Command<BitFlagDictValue<typeof CommandTriggers>, InteractionContextTypes[]>

export abstract class Command<
    const Triggers extends BitFlagDictValue<typeof CommandTriggers>,
    const Contexts extends InteractionContextTypes[],
> {
    name: string
    description: string
    aliases?: string[]
    access?: CommandAccess

    triggers: Triggers
    contexts: Contexts
    integrationTypes: ApplicationIntegrationTypes[]

    abstract execute(...args: unknown[]): unknown | Promise<unknown>

    constructor(options: CreateCommandOptions<Triggers, Contexts>) {
        this.name = options.name
        this.description = options.description
        this.aliases = options.aliases
        this.access = options.access
        this.triggers = options.triggers
        this.contexts = options.contexts
        this.integrationTypes = options.integrationTypes
    }

    /**
     * @internal This should only by classes extending {@link Command}.
     */
    protected static toApplicationCommand(cmd: AnyCommand): CreateApplicationCommandOptions {
        // @ts-expect-error
        return {
            name: cmd.name,
            contexts: cmd.contexts,
            integrationTypes: cmd.integrationTypes,
        }
    }

    static canExecuteInContext({ contexts }: AnyCommand, context: number): boolean {
        return contexts.includes(context)
    }

    static canExecuteViaTrigger({ triggers }: AnyCommand, trigger: number): boolean {
        return Boolean(triggers & trigger)
    }
}

export interface CreateCommandOptions<
    Triggers extends BitFlagDictValue<typeof CommandTriggers>,
    Contexts extends InteractionContextTypes[],
> {
    name: string
    description: string
    aliases?: string[]
    access?: CommandAccess
    /**
     * Things that can trigger the command.
     * @see {@link CommandTriggers}
     */
    triggers: Triggers
    /**
     * The contexts that the command can be executed in.
     * @see {@link InteractionContextTypes}
     */
    contexts: Contexts
    /**
     * The integration types that the command can be installed in, for {@link CommandTriggers.PlatformImplementation} commands.
     * @see {@link ApplicationIntegrationTypes}
     */
    integrationTypes: ApplicationIntegrationTypes[]
}

export interface CommandAccess {
    /**
     * The permissions that will match.
     */
    permissions?: bigint
    /**
     * The users that will match.
     */
    users?: string[]
    /**
     * The roles that will match.
     */
    roles?: string[]
    /**
     * The channels that will match.
     */
    channels?: string[]
    /**
     * The guilds that will match.
     */
    guilds?: string[]
    /**
     * The type of match mode to use when checking the access.
     * @see {@link CommandAccessMatchMode}
     */
    match: number
}

export type CommandTriggers = BitFlagDictValue<typeof CommandTriggers>

export const CommandTriggers = {
    /**
     * Triggered by Discord's implementation.
     */
    PlatformImplementation: 1,
    /**
     * Triggered by messages with prefixes or mentions.
     */
    ChatMessage: 2,
} as const

export type CommandContexts = InteractionContextTypes[]

export const AnyCommandTriggers = CommandTriggers.PlatformImplementation | CommandTriggers.ChatMessage

export const AnyCommandContexts = [
    InteractionContextTypes.GUILD,
    InteractionContextTypes.BOT_DM,
] as const satisfies Array<InteractionContextTypes>

export const AnyCommandIntegrationTypes = [
    ApplicationIntegrationTypes.GUILD_INSTALL,
    ApplicationIntegrationTypes.USER_INSTALL,
] as const satisfies Array<ApplicationIntegrationTypes>

export const CommandAccessMatchMode = {
    All: 1 << 0,
    Some: 1 << 1,
    Negate: 1 << 2,
} as const

export type CommandAccessMatchMode = BitFlagDictValue<typeof CommandAccessMatchMode>
