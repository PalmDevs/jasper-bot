import { config } from '~/context'
import { moderatorOnlyPreciate } from '../commands'
import { getMessage } from '../messages'
import { replaceAllAsync } from '../strings'
import { getUser } from '../users'
import {
    DiscordMessageIdToLLMMessageId,
    GlobalHistory,
    HistoryEntrySeparator,
    HistoryReset,
    MaxGlobalHistoryLength,
    MaxHistoryLength,
    MaxLinkFollow,
    TagAdmin,
    TagModel,
    TagModerator,
} from './constants'
import type { Message } from 'oceanic.js'
import type { ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'
import type { TextableChannel } from '../channels'
import type { MessageData, MessageDataEntry } from './types'

export let CurrentMessageId = 0

const MessageFormatRegex = /^\[msg_id: (\d+)(?: \(reply: (\d+)\))?\] \[([^\]]+)\]: (.+)$/
const UserMentionRegex = /<@(\d+)>/g

export async function formatMessage(
    msg: Message,
    channel: TextableChannel,
    history: MessageData,
    recurse = MaxLinkFollow,
): Promise<string> {
    if (CurrentMessageId > HistoryReset) CurrentMessageId = 0

    const { author: user } = msg
    const { globalName: ugname, username: uname, tag: utag, id: uid } = user

    const tags: string[] = []

    if (uid === msg.client.user.id) tags.push(TagModel)
    if (config.admin.users.includes(uid)) tags.push(TagAdmin)
    if (msg.guildID && (await moderatorOnlyPreciate({ executor: user, trigger: msg } as ChatCommandExecuteContext)))
        tags.push(TagModerator)

    // Sanitize and resolve mentions
    const content = await replaceAllAsync(sanitizeMessage(msg.content), UserMentionRegex, async ([full, id]) => {
        const user = await getUser(id!)
        return user ? `@${user.globalName ?? user.username}` : full!
    })

    const id = CurrentMessageId++

    // [msg_id: <int> (reply: <int>)] [<name>, <username> (<tags>)]: <content>
    const secondPart = ` [${ugname ?? uname}, ${utag}${tags.length ? ` (${tags.join(', ')})` : ''}]: ${content}`
    let firstPart = `[msg_id: ${id}`

    const reference = msg.messageReference
    if (reference && recurse > 0) {
        const mid = reference.messageID!
        const rId: number | undefined = DiscordMessageIdToLLMMessageId.get(mid)

        if (rId === undefined) {
            const rMsg = await getMessage(channel, mid)
            if (rMsg) {
                // Set before formatting message as we do CurrentMessageId++
                // and we want to use the same ID for the response message
                DiscordMessageIdToLLMMessageId.set(mid, CurrentMessageId)
                addHistoryEntry(history, {
                    role: rMsg.author.id === msg.client.user.id ? 'model' : 'user',
                    content: [
                        {
                            text: await formatMessage(rMsg, channel, history, recurse - 1),
                        },
                    ],
                })
            }
        }

        if (rId !== undefined) firstPart += ` (reply: ${rId})`
    }

    firstPart += ']'

    DiscordMessageIdToLLMMessageId.set(msg.id, id)

    return firstPart + secondPart
}

export function getResponseContent(text: string): string {
    const match = text.match(MessageFormatRegex)
    if (!match) throw new Error(`Invalid message format: ${text}`)

    const [, , , , content] = match
    return content!
}

export function addHistoryEntry(history: MessageData, data: MessageDataEntry, trim?: boolean) {
    history.push(data)
    GlobalHistory.push(data)

    if (trim) {
        trimHistory(GlobalHistory, MaxGlobalHistoryLength)
        trimHistory(history, MaxHistoryLength)
    }
}

export function historyWithGlobalContext(history: MessageData) {
    const messages = [...history]

    let lastIndex = -1
    for (const msg of GlobalHistory) {
        const newLastIndex = messages.indexOf(msg)
        if (newLastIndex > lastIndex) {
            lastIndex = newLastIndex
            continue
        }

        // Add message after lastIndex if it's not a duplicate
        messages.splice(lastIndex + 1, 0, msg)
    }

    // First content should be user message
    while (messages[0]?.role !== 'user') messages.shift()

    return messages
}

export function trimHistory(history: MessageData, maxLength: number) {
    if (history.length > maxLength) history.splice(0, history.length - maxLength)
}

function sanitizeMessage(content: string) {
    return content.replaceAll(HistoryEntrySeparator, '. ')
}
