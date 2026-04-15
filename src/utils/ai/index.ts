import assert from 'assert'
import { ai, config, log } from '~/context'
import { getChannel, isTextableChannel } from '../channels'
import { getUser } from '../users'
import {
    BaseSystemPrompt,
    DiscordMessageIdToLLMMessageId,
    Histories,
    MaxOutputTokens,
    Models,
    Temparature,
    Timeout,
    TopKeywords,
    TopPercent,
} from './constants'
import { addHistoryEntry, CurrentMessageId, formatMessage, getResponseContent, historyWithGlobalContext } from './utils'
import type { Message } from 'oceanic.js'

const LogTag = 'utils/ai'

export async function respondFromMessage(msg: Message) {
    const channel = await getChannel(msg.channelID)
    assert(channel && isTextableChannel(channel), 'Channel not available or is not textable')

    // biome-ignore lint/suspicious/noAssignInExpressions: This is readable
    const history = (Histories[msg.channelID] ??= [])

    const contentText = await formatMessage(msg, channel, history)

    const metadata = {
        created: Date.now(),
    }

    addHistoryEntry(history, {
        role: 'user',
        content: [
            {
                text: contentText,
            },
        ],
        metadata,
    })

    const Bosses = await Promise.all(config.admin.users.map(getUser))
    const InfoSection = `

### Info

  * **Bosses**:
${Bosses.filter(Boolean)
    .map(b => `    - ${b!.globalName} (@${b!.tag})`)
    .join('\n')}
  * **Server**: ${'guildID' in channel ? channel.guildID : '(None)'}
  * **Channel**: ${'name' in channel ? channel.name : '(DM)'}`

    log.debug(LogTag, `Generating AI response for message ${msg.id} with content:`, contentText)

    const messages = historyWithGlobalContext(history)

    await channel.sendTyping()

    // Try each model in order, if one fails, log the error and try the next one
    for (const model of Models) {
        log.debug(LogTag, `Attempting to generate AI response for message ${msg.id} with model ${model.name}`)

        try {
            const response = await ai.generate({
                model,
                system: BaseSystemPrompt + InfoSection,
                abortSignal: AbortSignal.timeout(Timeout),
                config: {
                    temperature: Temparature,
                    topK: TopKeywords,
                    topP: TopPercent,
                    maxOutputTokens: MaxOutputTokens + 25, // +25 for message formatting
                },
                toolChoice: 'none',
                messages,
            })

            if (!response.message) throw new Error('No response generated')

            const responseText = response.text

            log.debug(LogTag, `AI response generated for message ${msg.id}:`, responseText)

            const content = getResponseContent(response.text)
            const res = await channel.createMessage({
                content,
                messageReference: {
                    failIfNotExists: true,
                    messageID: msg.id,
                },
            })

            // Set before formatting message as formatMessage does CurrentMessageId++
            // and we want to use the same ID for the response message
            DiscordMessageIdToLLMMessageId.set(res.id, CurrentMessageId)

            addHistoryEntry(
                history,
                {
                    role: 'model',
                    content: [
                        {
                            text: await formatMessage(res, channel, history, 0),
                        },
                    ],
                    metadata,
                },
                true,
            )

            // Success!
            return
        } catch (err) {
            log.error(LogTag, `Error generating AI response for message ${msg.id} with model ${model.name}:`, err)
        }
    }
}
