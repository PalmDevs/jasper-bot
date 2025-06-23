import {
    ApplicationCommandOptionTypes,
    ApplicationIntegrationTypes,
    InteractionContextTypes,
    Message,
} from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionTypes } from '~/classes/commands/ChatCommandConstants'
import { AnyCommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'
import { ModeratorOnlyAccess } from '~/utils/commands'
import { embed } from '~/utils/embeds'

export default new ChatCommand({
    name: 'purge',
    description: 'Remove messages from the channel.',
    aliases: ['nuke'],
    options: [
        {
            name: 'amount',
            type: ApplicationCommandOptionTypes.INTEGER,
            description: 'How many messages to remove?',
            required: true,
            minValue: 1,
            maxValue: 100,
        },
        {
            name: 'before',
            type: ChatCommandOptionTypes.MESSAGE,
            description: 'The message to delete messages before.',
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: AnyCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, { amount, before }, actions) {
        const { trigger } = context
        const { channel } = trigger

        const msgs = await channel
            .getMessages({
                before: before?.id ?? (trigger instanceof Message ? trigger.id : undefined),
                limit: amount,
            })
            .then(it => it.map(msg => msg.id))

        await channel.deleteMessages(msgs)

        await actions.reply({
            embeds: [
                embed({
                    title: string(s.command.purge.success, amount),
                }),
            ],
        })
    },
})
