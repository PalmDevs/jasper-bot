import { ApplicationCommandOptionTypes } from 'oceanic.js'
import { setTimeout as setTimeoutPromise } from 'timers/promises'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { AnyCommandContexts, AnyCommandIntegrationTypes, CommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'

export default new ChatCommand({
    name: 'is',
    description: 'Ask Jasper a question.',
    aliases: [
        'am',
        'are',
        'do',
        'does',
        'will',
        'would',
        'should',
        'could',
        'can',
        'may',
        'might',
        'shall',
        'has',
        'have',
        'had',
        'was',
        'were',
    ],
    options: [
        {
            name: 'question',
            description: 'The question to ask the 8ball.',
            type: ApplicationCommandOptionTypes.STRING,
            required: false,
        },
    ],
    triggers: CommandTriggers.ChatMessage,
    contexts: AnyCommandContexts,
    integrationTypes: AnyCommandIntegrationTypes,
    async execute(context, { question }, actions) {
        if (!question) return

        const { trigger } = context
        const { channel } = trigger

        if (channel) await channel.client.rest.channels.sendTyping(channel.id)
        await setTimeoutPromise(500)

        await actions.reply({
            content: string(s.command.is.response),
        })
    },
})
