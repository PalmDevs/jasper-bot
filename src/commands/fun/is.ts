import { fuzzy } from 'fast-fuzzy'
import { ApplicationCommandOptionTypes, type Message } from 'oceanic.js'
import { setTimeout as setTimeoutPromise } from 'timers/promises'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { CommandTriggers, DefaultCommandContexts, DefaultCommandIntegrationTypes } from '~/classes/commands/Command'
import { s, string } from '~/strings'

// Message -> Response Index
const recentResponses = new WeakMap<Message, number>()

const MinConfirmationResponseScore = 0.75
const ConfirmationResponses = [
    'absolutely sure',
    'seriously',
    'you for real',
    'you sure',
    'that true',
    'that real',
    'you serious',
    'you kidding',
    'that really',
]

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
            greedy: true,
            required: false,
        },
    ],
    triggers: [CommandTriggers.ChatMessage, CommandTriggers.ChatMessagePrefixless],
    contexts: DefaultCommandContexts,
    integrationTypes: DefaultCommandIntegrationTypes,
    async execute(context, { question }, actions) {
        if (!question) return

        // Remove any common special characters from the question
        question = question
            .toLowerCase()
            .replaceAll(/[.?!,*#]+$/g, '')
            .trim()

        const { trigger } = context
        const { channelID, client } = trigger

        await client.rest.channels.sendTyping(channelID)
        await setTimeoutPromise(1000)

        if (trigger.messageReference && trigger.channel)
            // The user is asking us to confirm a previous response
            // So we double down on it, YEAH!
            for (const response of ConfirmationResponses)
                if (fuzzy(question, response) >= MinConfirmationResponseScore) {
                    // Attempt to get message from cache
                    const msg = trigger.channel.messages.get(trigger.messageReference.messageID!)
                    if (!msg) return

                    const responseIndex = recentResponses.get(msg)
                    if (responseIndex !== undefined) {
                        const msg = await actions.reply({
                            content: string(s.command.is.actionConfirm[responseIndex]!, question),
                        })

                        recentResponses.set(msg, responseIndex)
                        return
                    }
                }

        const { action: responses } = s.command.is
        const idx = Math.floor(Math.random() * responses.length)

        recentResponses.set(
            await actions.reply({
                content: string(responses[idx]!),
            }),
            idx,
        )
    },
})
