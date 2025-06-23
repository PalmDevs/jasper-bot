import {
    ApplicationCommandOptionTypes,
    ApplicationIntegrationTypes,
    InteractionContextTypes,
    Message,
} from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import {
    ChatCommandOptionsWithReadMessageReferenceMode,
    ChatCommandOptionTypes,
} from '~/classes/commands/ChatCommandConstants'
import { AnyCommandTriggers } from '~/classes/commands/Command'
import { ModeratorOnlyAccess } from '~/utils/commands'

export default new ChatCommand({
    name: 'reply',
    description: 'Make me more sentient.',
    aliases: ['say'],
    options: [
        {
            name: 'message',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'The message to reply with',
            required: true,
        },
        {
            name: 'reference',
            type: ChatCommandOptionTypes.MESSAGE,
            description: 'The message to reply to',
            readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Fallback,
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: AnyCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, options) {
        const { trigger } = context

        if (trigger instanceof Message) await trigger.delete()

        await trigger.client.rest.channels.createMessage(trigger.channelID, {
            content: options.message,
            messageReference: options.reference
                ? {
                      messageID: options.reference.id,
                  }
                : undefined,
        })
    },
})
