import assert from 'assert'
import { ai, config } from '~/context'
import { getChannel, isTextableChannel } from '../channels'
import { getUser } from '../users'
import {
    BaseSystemPrompt,
    GlobalHistory,
    Histories,
    MaxGlobalHistoryLength,
    MaxHistoryLength,
    MaxOutputTokens,
    Temparature,
    Timeout,
    TopKeywords,
} from './constants'
import { formatMessage, historyWithGlobalContext, trimHistory } from './utils'
import type { Message } from 'oceanic.js'

export async function generateFromMessage(msg: Message) {
    const channel = await getChannel(msg.channelID)
    assert(channel && isTextableChannel(channel), 'Channel not available or is not textable')

    // biome-ignore lint/suspicious/noAssignInExpressions: This is readable
    const history = (Histories[msg.channelID] ??= [])

    history.push({
        role: 'user',
        content: [
            {
                text: await formatMessage(msg),
            },
        ],
    })

    const Bosses = await Promise.all(config.admin.users.map(getUser))
    const InfoSection = `

## Info

  - **You are**: ${msg.client.user.tag}
  - **Bosses**:
${Bosses.filter(Boolean)
    .map(b => `    * ${b!.tag} (${b!.username})`)
    .join('\n')}
  - **Server**: ${'guildID' in channel ? channel.guildID : '(None)'}
  - **Channel**: ${'name' in channel ? channel.name : '(DM)'}`

    const messages = historyWithGlobalContext(history)
    const response = await ai.generate({
        system: BaseSystemPrompt + InfoSection,
        abortSignal: AbortSignal.timeout(Timeout),
        config: {
            temperature: Temparature,
            topK: TopKeywords,
            maxOutputTokens: MaxOutputTokens,
        },
        toolChoice: 'none',
        messages,
    })

    if (!response.message) throw new Error('No response generated')

    const data = {
        role: response.message.role,
        content: response.message.content,
    }

    GlobalHistory.push(data)
    history.push(data)

    trimHistory(GlobalHistory, MaxGlobalHistoryLength)
    trimHistory(history, MaxHistoryLength)

    return response.text
}
