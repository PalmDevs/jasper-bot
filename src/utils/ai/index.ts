import assert from 'assert'
import { ai, config, log } from '~/context'
import { getChannel, isTextableChannel } from '../channels'
import { getUser } from '../users'
import {
    BaseSystemPrompt,
    DiscordMessageIdToLLMMessageId,
    Histories,
    MaxOutputTokens,
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

    const code = crypto.getRandomValues(Buffer.alloc(4)).toHex()
    const contentText = await formatMessage(msg, channel, history, code)

    addHistoryEntry(history, {
        role: 'user',
        content: [
            {
                text: contentText,
            },
        ],
    })

    const Bosses = await Promise.all(config.admin.users.map(getUser))
    const InfoSection = `

### Info

  * **Code**: \`${code}\`
  * **Bosses**:
${Bosses.filter(Boolean)
    .map(b => `    - ${b!.tag} (${b!.username})`)
    .join('\n')}
  * **Server**: ${'guildID' in channel ? channel.guildID : '(None)'}
  * **Channel**: ${'name' in channel ? channel.name : '(DM)'}`

    log.debug(LogTag, `Generating AI response for message ${msg.id} with content:`, contentText)

    const messages = historyWithGlobalContext(history)

    await channel.sendTyping()

    const response = await ai.generate({
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
                    text: await formatMessage(res, channel, history, code, 0),
                },
            ],
        },
        true,
    )
}
