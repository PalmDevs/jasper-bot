import { ApplicationCommandOptionTypes, ApplicationIntegrationTypes, InteractionContextTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { AnyCommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'
import { durationOptionResolver, ModeratorOnlyAccess } from '~/utils/commands'
import { formatDuration } from '~/utils/durations'
import { embed } from '~/utils/embeds'

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
                min: 1000,
                max: MaxDuration,
            }),
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: AnyCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, { duration }, actions) {
        const { trigger } = context

        await trigger.client.rest.channels.edit(trigger.channelID, {
            rateLimitPerUser: duration.offset / 1000,
        })

        await actions.reply({
            embeds: [
                embed({
                    title: string(s.command.slowmode.success, formatDuration(duration.offset)),
                }),
            ],
        })
    },
})
