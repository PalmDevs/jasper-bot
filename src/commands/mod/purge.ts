import {
    ApplicationCommandOptionTypes,
    ApplicationIntegrationTypes,
    InteractionContextTypes,
    Message,
} from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionTypes } from '~/classes/commands/ChatCommandConstants'
import { DefaultCommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'
import { ModeratorOnlyAccess } from '~/utils/commands'
import { embed, field } from '~/utils/embeds'
import { sendModerationLog } from '~/utils/mod'

export default new ChatCommand({
    name: 'purge',
    description: 'Clean up the room.',
    aliases: ['nuke'],
    options: [
        {
            name: 'amount',
            type: ApplicationCommandOptionTypes.INTEGER,
            description: 'How many messages?',
            required: true,
            minValue: 1,
            maxValue: 100,
        },
        {
            name: 'before',
            type: ChatCommandOptionTypes.MESSAGE,
            description: 'What to use as the starting point?',
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, { amount, before }, actions) {
        const { executor, trigger } = context
        const { channel } = trigger

        const msgs = await channel
            .getMessages({
                before: before?.id ?? (trigger instanceof Message ? trigger.id : undefined),
                limit: amount,
            })
            .then(it => it.map(msg => msg.id))

        await channel.deleteMessages(msgs)

        const fields = [field(string(s.generic.moderator), executor.mention)]
        if (before) fields.unshift(field(string(s.generic.before), before.jumpLink))

        const purgeEmbed = embed({
            title: string(s.command.purge.action, amount),
            fields,
        })

        await sendModerationLog(
            purgeEmbed,
            await actions.reply({
                embeds: [purgeEmbed],
            }),
        )
    },
})
