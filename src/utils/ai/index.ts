import assert from 'assert'
import { ai, config, log } from '~/context'
import { getChannel, isTextableChannel } from '../channels'
import { getUser } from '../users'
import {
    BaseSystemPrompt,
    DiscordMessageIdToLLMMessageId,
    Histories,
    HistoryMinimumThreshold,
    MaxHistoryGroupLength,
    MaxOutputTokens,
    Models,
    Temparature,
    Timeout,
    TopKeywords,
    TopPercent,
} from './constants'
import {
    addHistoryEntry,
    CurrentMessageId,
    formatMessage,
    formatMessageGroup,
    getResponseContent,
    historyWithGlobalContext,
} from './utils'
import type { Message } from 'oceanic.js'

const LogTag = 'utils/ai'

export async function respondFromMessage(msg: Message) {
    const channel = await getChannel(msg.channelID)
    assert(channel && isTextableChannel(channel), 'Channel not available or is not textable')

    // biome-ignore lint/suspicious/noAssignInExpressions: This is readable
    const history = (Histories[msg.channelID] ??= [])

    const context = { guildID: msg.guildID, channelID: msg.channelID }

    if (history.length < HistoryMinimumThreshold) {
        try {
            const recentMessages = await channel.getMessages({ limit: 50, before: msg.id })

            // Group messages by author
            const groups: Message[][] = []
            let currentGroup: Message[] = []

            for (const m of recentMessages.reverse()) {
                if (m.author.bot) continue

                if (currentGroup[0]?.author.id === m.author.id) {
                    currentGroup.push(m)
                } else {
                    if (currentGroup.length > 0) groups.push(currentGroup)
                    currentGroup = [m]
                }
            }
            if (currentGroup.length > 0) groups.push(currentGroup)

            const lastGroups = groups.slice(-MaxHistoryGroupLength)

            for (const group of lastGroups) {
                const groupContent = await formatMessageGroup(group, channel, history, 0, context)
                addHistoryEntry(history, {
                    role: 'user',
                    content: groupContent,
                    metadata: { created: group.at(-1)?.createdAt.getTime() },
                })
            }
        } catch (err) {
            log.warn(LogTag, 'Failed to fetch recent messages for context:', err)
        }
    }

    const content = await formatMessage(msg, channel, history, undefined, context)
    const metadata = {
        created: Date.now(),
    }

    addHistoryEntry(history, {
        role: 'user',
        content,
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
  * **Channel**: ${'name' in channel ? channel.name : '(DM)'}
  * **Current Time**: ${new Date().toLocaleString()}`

    log.debug(LogTag, `Generating AI response for message ${msg.id} with content:`, content)

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
                    maxOutputTokens: MaxOutputTokens + 50, // +50 for message formatting
                    googleSearch: true,
                    googleSearchRetrieval: true,
                    urlContext: true,
                },
                messages,
            })

            if (!response.message) throw new Error('No response generated')

            const responseText = response.text

            log.debug(LogTag, `AI response generated for message ${msg.id}:`, responseText)

            const contentText = getResponseContent(response.text)
            const res = await channel.createMessage({
                content: contentText,
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
                    content: await formatMessage(res, channel, history, 0, context),
                    metadata: { created: Date.now() },
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
