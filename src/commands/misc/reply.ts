import {
    ApplicationCommandOptionTypes,
    ApplicationIntegrationTypes,
    InteractionContextTypes,
    MessageFlags,
} from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import {
    ChatCommandOptionsWithReadMessageReferenceMode,
    ChatCommandOptionTypes,
} from '~/classes/commands/ChatCommandConstants'
import { CommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'
import { ModeratorOnlyAccess } from '~/utils/commands'

export default new ChatCommand({
    name: 'reply',
    description: 'Say something as me, sure is fun, totally.',
    aliases: ['say'],
    options: [
        {
            name: 'message',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'What do I say?',
            required: true,
        },
        {
            name: 'reference',
            type: ChatCommandOptionTypes.MESSAGE,
            description: 'What do I reply to?',
            readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Fallback,
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: CommandTriggers.PlatformImplementation,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, options) {
        const { trigger } = context

        await trigger.client.rest.channels.createMessage(trigger.channelID, {
            content: options.message,
            messageReference: options.reference
                ? {
                      messageID: options.reference.id,
                  }
                : undefined,
        })

        await trigger.reply({
            content: string(s.command.reply.success),
            flags: MessageFlags.EPHEMERAL,
        })
    },
})
