import { ApplicationCommandOptionTypes, ApplicationIntegrationTypes, InteractionContextTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { DefaultCommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'
import { durationOptionResolver, ModeratorOnlyAccess } from '~/utils/commands'
import { formatDuration } from '~/utils/durations'
import { embed, field } from '~/utils/embeds'
import { sendModerationLog } from '~/utils/mod'

const MaxDuration = 216e5

export default new ChatCommand({
    name: 'slowmode',
    description: "No one shuttin' up?",
    aliases: ['sm'],
    options: [
        {
            name: 'duration',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'How long?',
            required: true,
            resolver: durationOptionResolver({
                min: 0,
                max: MaxDuration,
                defaultUnit: 's',
            }),
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, { duration }, actions) {
        const { trigger } = context

        await trigger.client.rest.channels.edit(trigger.channelID, {
            rateLimitPerUser: duration.offset / 1000,
        })

        const smEmbed = embed({
            title: string(s.command.slowmode.action, formatDuration(duration.offset)),
            fields: [field(string(s.generic.moderator), context.executor.mention)],
        })

        await sendModerationLog(
            smEmbed,
            await actions.reply({
                embeds: [smEmbed],
            }),
        )
    },
})
