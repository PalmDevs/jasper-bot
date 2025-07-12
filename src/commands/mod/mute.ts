import { ApplicationCommandOptionTypes, ApplicationIntegrationTypes, InteractionContextTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionsWithReadMessageReferenceMode } from '~/classes/commands/ChatCommandConstants'
import { DefaultCommandTriggers } from '~/classes/commands/Command'
import { SelfError, UserError } from '~/classes/Error'
import { s, string } from '~/strings'
import { durationOptionResolver, ModeratorOnlyAccess } from '~/utils/commands'
import { parseDuration } from '~/utils/durations'
import { embed, field } from '~/utils/embeds'
import { subtext } from '~/utils/formatters'
import { getMember, isMemberPunishable } from '~/utils/guilds'
import { sendModerationLog } from '~/utils/mod'

const MaxDuration = parseDuration('4w')

export default new ChatCommand({
    name: 'mute',
    description: "Somebody bein' a bit of an ass?",
    aliases: ['stfu', 'shutup', 'shut'],
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionTypes.USER,
            description: 'Who?',
            readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Prioritize,
            required: true,
        },
        {
            name: 'duration',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'How long? (Range: 1 second - 28 days) (Default: 28 days)',
            resolver: durationOptionResolver({
                skipInvalid: true,
                min: 1000,
                max: MaxDuration.offset,
            }),
        },
        {
            name: 'proof',
            type: ApplicationCommandOptionTypes.ATTACHMENT,
            description: 'Any proof?',
        },
        {
            name: 'reason',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'What for?',
            greedy: true,
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute({ executor, trigger }, { user, duration, proof, reason }, actions) {
        duration ??= MaxDuration

        const member = await getMember(trigger.guildID, user.id)
        if (!member) throw new UserError(string(s.generic.command.errors.userNotInGuild, user.mention))
        if (await isMemberPunishable(member))
            throw new SelfError(string(s.generic.command.errors.memberNotPunishable, member.mention))

        const { fromNow } = duration

        await member.edit({
            communicationDisabledUntil: fromNow.toISOString(),
            reason,
        })

        const timestamp = Math.ceil(fromNow.getTime() / 1000)
        const muteEmbed = embed({
            title: string(s.command.mute.action, member.tag),
            fields: [
                field(string(s.generic.member), member.mention),
                field(string(s.generic.moderator), executor.mention, true),
                field(string(s.generic.reason), reason ?? subtext(string(s.generic.command.defaults.reason)), true),
                field(string(s.generic.expires), `<t:${timestamp}> (<t:${timestamp}:R>)`, true),
            ],
        })

        await sendModerationLog(
            muteEmbed,
            await actions.reply({
                embeds: [muteEmbed],
            }),
            proof?.url,
        )
    },
})
