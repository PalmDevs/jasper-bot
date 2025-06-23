import { CommandAccessMatchMode } from '~/classes/commands/Command'
import { UserError } from '~/classes/Error'
import { config } from '~/context'
import { s, string } from '~/strings'
import { formatDuration, parseDuration } from './durations'
import { getMember } from './guilds'
import type { Duration } from '@sapphire/duration'
import type { ChatCommandAccess, ChatCommandOptionsStringWithResolver } from '~/classes/commands/ChatCommand'

export const moderatorOnlyPreciate: NonNullable<ChatCommandAccess['predicate']> = async ({
    trigger: { guildID },
    executor,
}) => {
    if (!guildID) return false

    const roles = config.mod?.guilds[guildID]?.roles
    if (!roles) return false

    const member = await getMember(guildID, executor.id)
    if (!member) return false

    return member.roles.some(role => roles.includes(role))
}

export const adminOnlyPreciate: NonNullable<ChatCommandAccess['predicate']> = async ({ executor }) =>
    config.admin.users.includes(executor.id)

export const ModeratorOnlyAccess: ChatCommandAccess = {
    match: CommandAccessMatchMode.All,
    predicate: moderatorOnlyPreciate,
}

export const AdminOnlyAccess: ChatCommandAccess = {
    match: CommandAccessMatchMode.All,
    predicate: adminOnlyPreciate,
}

export type DurationOptionResolverOptions<SkipInvalid extends boolean = boolean> = {
    min?: number
    max?: number
} & If<
    SkipInvalid,
    {
        skipInvalid: SkipInvalid
    },
    {
        skipInvalid?: SkipInvalid
    }
>

export function durationOptionResolver(
    options?: DurationOptionResolverOptions<false>,
): ChatCommandOptionsStringWithResolver<Duration>['resolver']
export function durationOptionResolver(
    options: DurationOptionResolverOptions<true>,
): ChatCommandOptionsStringWithResolver<Duration | undefined>['resolver']
export function durationOptionResolver(
    options?: DurationOptionResolverOptions,
): ChatCommandOptionsStringWithResolver<Duration | undefined>['resolver'] {
    return (arg, pass) => {
        const duration = parseDuration(arg)
        if (Number.isNaN(duration.offset)) {
            if (options?.skipInvalid) return pass() as undefined
            throw new UserError(string(s.generic.command.errors.invalidDuration, arg))
        }

        const { offset } = duration

        if (
            (options?.min !== undefined && offset < options.min) ||
            (options?.max !== undefined && offset > options.max)
        )
            throw new UserError(
                string(
                    s.generic.command.errors.badDuration,
                    options.min !== undefined ? formatDuration(options.min) : undefined,
                    options?.max !== undefined ? formatDuration(options.max) : undefined,
                ),
            )

        return duration
    }
}
