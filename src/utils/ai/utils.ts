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
    MaxHistoryEntryExpiry,
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

const UserMentionRegex = /<@(\d+)>/g

export async function formatMessage(
    msg: Message,
    channel: TextableChannel,
    history: MessageData,
    recurse = MaxLinkFollow,
): Promise<string> {
    if (CurrentMessageId > HistoryReset) CurrentMessageId = 0

    const { author: user } = msg
    const { globalName: ugname, username: uname, id: uid } = user

    const roles: string[] = []

    if (uid === msg.client.user.id) roles.push(TagModel)
    if (config.admin.users.includes(uid)) roles.push(TagAdmin)
    if (msg.guildID && (await moderatorOnlyPreciate({ executor: user, trigger: msg } as ChatCommandExecuteContext)))
        roles.push(TagModerator)

    // Sanitize and resolve mentions
    const content = await replaceAllAsync(sanitizeMessage(msg.content), UserMentionRegex, async ([full, id]) => {
        const user = await getUser(id!)
        return user ? `@${user.globalName ?? user.username}` : full!
    })

    const id = CurrentMessageId++

    let attrs = `id=${id} user="${sanitizeAttr(ugname ?? uname)}"`
    if (roles.length) attrs += ` role="${roles.join(',')}"`

    const reference = msg.messageReference
    if (reference && recurse > 0) {
        const mid = reference.messageID!
        let rId: number | undefined = DiscordMessageIdToLLMMessageId.get(mid)

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
            rId = DiscordMessageIdToLLMMessageId.get(mid)
        }

        if (rId !== undefined) attrs += ` reply=${rId}`
    }

    DiscordMessageIdToLLMMessageId.set(msg.id, id)

    return `<msg ${attrs}>${content}</msg>`
}

export function getResponseContent(text: string): string {
    const content = text.replace(/<\/?msg[^>]*>/g, '').trim()
    if (!content) throw new Error('Empty response from model')
    return content
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
    const dateThreshold = Date.now() - MaxHistoryEntryExpiry
    for (const entry of history) if (entry.metadata?.created ?? 0 < dateThreshold) history.shift()

    if (history.length > maxLength) history.splice(0, history.length - maxLength)
}

function sanitizeMessage(content: string) {
    return content.replaceAll(HistoryEntrySeparator, '. ').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function sanitizeAttr(value: string) {
    return value.replaceAll('"', '').replaceAll('<', '').replaceAll('>', '')
}
