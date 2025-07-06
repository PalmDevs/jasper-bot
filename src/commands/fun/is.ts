import { ApplicationCommandOptionTypes } from 'oceanic.js'
import { setTimeout as setTimeoutPromise } from 'timers/promises'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { CommandTriggers, DefaultCommandContexts, DefaultCommandIntegrationTypes } from '~/classes/commands/Command'
import { s, string } from '~/strings'

export default new ChatCommand({
    name: 'is',
    description: 'Ask me a question.',
    aliases: [
        'am',
        'are',
        'do',
        'does',
        'did',
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
            description: 'What is it?',
            type: ApplicationCommandOptionTypes.STRING,
            required: false,
        },
    ],
    triggers: [CommandTriggers.ChatMessage, CommandTriggers.ChatMessagePrefixless],
    contexts: DefaultCommandContexts,
    integrationTypes: DefaultCommandIntegrationTypes,
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
