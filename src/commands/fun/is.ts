import { distance } from 'fastest-levenshtein'
import { ApplicationCommandOptionTypes, type Message } from 'oceanic.js'
import { setTimeout as setTimeoutPromise } from 'timers/promises'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { CommandTriggers, DefaultCommandContexts, DefaultCommandIntegrationTypes } from '~/classes/commands/Command'
import { SortedLRUMap } from '~/classes/SortedLRUMap'
import { s, string } from '~/strings'
import { SimHashNgramSize, simHash } from '~/utils/hashes'

// Message -> Response Index
const recentResponses = new WeakMap<Message, number>()
// Hash -> Response Index
const recentQuestions = new SortedLRUMap<number>(100)
const MaxDiffPercent = 0.15 // 15% difference

const MaxConfirmationResponseDistance = 3
const ConfirmationResponses = [
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
        'how',
        'why',
        'where',
        'when',
        'who',
        'which',
        'what',
        'whom',
        'whose',
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
            for (const response of ConfirmationResponses)
                if (distance(question, response) <= MaxConfirmationResponseDistance) {
                    // Attempt to get message from cache
                    const msg = trigger.channel.messages.get(trigger.messageReference.messageID!)
                    if (!msg) return

                    const responseIndex = recentResponses.get(msg)
                    if (responseIndex !== undefined) {
                        const msg = await actions.reply({
                            content: string(s.command.is.responseConfirm[responseIndex]!, question),
                        })

                        recentResponses.set(msg, responseIndex)
                        return
                    }
                }

        // Always pad the question so it's always more than SimHashNgramSize characters long
        // And to ensure the hash is similar for a similar question without padding
        question += ' '.repeat(SimHashNgramSize)

        const arr = simHash.compute_bitarray(question)
        let hash = 0
        for (let i = 0; i < 48; i++) hash |= arr[i]! ** i

        const { response } = s.command.is

        const closest = recentQuestions.getClosest(hash)
        if (closest && Math.abs(closest.key - hash) <= hash * MaxDiffPercent) {
            recentQuestions.set(hash, closest.value)
            // If the closest question is within 10% of the hash, return the same response
            return await actions.reply({
                content: string(response[closest.value]!),
            })
        }

        const idx = Math.floor(Math.random() * response.length)
        recentQuestions.set(hash, idx)

        const msg = await actions.reply({
            content: string(s.command.is.response[idx]!),
        })

        recentResponses.set(msg, idx)
    },
})
