import { config } from '~/context'
import { getChannel } from '../channels'
import { moderatorOnlyPreciate } from '../commands'
import { getGuild } from '../guilds'
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
import type { Part } from 'genkit'
import type { Message } from 'oceanic.js'
import type { ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'
import type { TextableChannel } from '../channels'
import type { MessageData, MessageDataEntry } from './types'

export let CurrentMessageId = 0

const MimeMap = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
} as const

const UserMentionRegex = /<@(\d+)>/g

export async function formatMessage(
    msg: Message,
    channel: TextableChannel,
    history: MessageData,
    recurse = MaxLinkFollow,
    context?: { guildID?: string | null; channelID: string },
): Promise<Part[]> {
    return formatMessageGroup([msg], channel, history, recurse, context)
}

export async function formatMessageGroup(
    msgs: Message[],
    channel: TextableChannel,
    history: MessageData,
    recurse = MaxLinkFollow,
    context?: { guildID?: string | null; channelID: string },
): Promise<Part[]> {
    if (CurrentMessageId > HistoryReset) CurrentMessageId = 0
    if (!msgs.length) return []

    const firstMsg = msgs[0]!
    const { author: user } = firstMsg
    const { globalName: ugname, username: uname, id: uid } = user

    const roles: string[] = []

    if (uid === firstMsg.client.user.id) roles.push(TagModel)
    if (config.admin.users.includes(uid)) roles.push(TagAdmin)
    if (
        firstMsg.guildID &&
        (await moderatorOnlyPreciate({ executor: user, trigger: firstMsg } as ChatCommandExecuteContext))
    )
        roles.push(TagModerator)

    const isBossOrMod = roles.includes(TagAdmin) || roles.includes(TagModerator)
    const id = CurrentMessageId++

    let attrs = `id=${id} user="${sanitizeAttr(ugname ?? uname)}"`
    if (roles.length) attrs += ` role="${roles.join(',')}"`

    // Add location info if it differs from current context
    if (context) {
        if (firstMsg.guildID !== context.guildID) {
            const guild = firstMsg.guildID ? await getGuild(firstMsg.guildID) : null
            attrs += ` server="${sanitizeAttr(guild?.name ?? 'DM')}"`
        }
        if (firstMsg.channelID !== context.channelID) {
            const channel = (await getChannel(firstMsg.channelID)) as TextableChannel
            attrs += ` channel="${sanitizeAttr(channel && 'name' in channel ? channel.name : 'DM')}"`
        }
    }

    // Reference from any message in the group
    // But we only handle the first one that has a reference for simplicity
    const msgWithRef = msgs.find(m => m.messageReference)
    if (msgWithRef && recurse > 0) {
        const mid = msgWithRef.messageReference!.messageID!
        let rId: number | undefined = DiscordMessageIdToLLMMessageId.get(mid)

        if (rId === undefined) {
            const rMsg = await getMessage(channel, mid)
            if (rMsg) {
                // Set before formatting message as we do CurrentMessageId++
                // and we want to use the same ID for the response message
                DiscordMessageIdToLLMMessageId.set(mid, CurrentMessageId)
                addHistoryEntry(history, {
                    role: rMsg.author.id === firstMsg.client.user.id ? 'model' : 'user',
                    content: await formatMessageGroup([rMsg], channel, history, recurse - 1, context),
                })
            }
            rId = DiscordMessageIdToLLMMessageId.get(mid)
        }

        if (rId !== undefined) attrs += ` reply=${rId}`
    }

    for (const m of msgs) {
        DiscordMessageIdToLLMMessageId.set(m.id, id)
    }

    const contents: string[] = []
    const parts: Part[] = []

    for (const msg of msgs) {
        // Sanitize and resolve mentions
        let content = await replaceAllAsync(sanitizeMessage(msg.content), UserMentionRegex, async ([full, id]) => {
            const user = await getUser(id!)
            return user ? `@${user.globalName ?? user.username}` : full!
        })

        if (!isBossOrMod && content.length > 1000) {
            content = `${content.slice(0, 1000)}... (trimmed)`
        }
        contents.push(content)

        // Image recognition from attachments
        for (const attachment of msg.attachments.values()) {
            if (attachment.contentType?.startsWith('image/')) {
                parts.push({
                    media: {
                        url: attachment.url,
                        contentType: attachment.contentType,
                    },
                })
            }
        }

        // Embedded images
        for (const embed of msg.embeds) {
            if (embed.type !== 'image') continue
            if (!embed.thumbnail?.url) continue

            const url = embed.thumbnail.url
            const ext = url.split('.').pop()?.toLowerCase()
            const contentType = ext && MimeMap[ext as keyof typeof MimeMap]
            if (!contentType) continue

            parts.push({
                media: {
                    url: embed.thumbnail.url,
                    contentType,
                },
            })
        }
    }

    parts.unshift({
        text: `<msg ${attrs}>${contents.join('\n')}</msg>`,
    })

    return parts
}

export function getResponseContent(text: string): string {
    const content = text.replace(/<\/?msg[^>]*>/g, '').trim()
    if (!content) throw new Error('Empty response from model')
    return content
}

export function addHistoryEntry(history: MessageData, data: MessageDataEntry, trim?: boolean) {
    const isDuplicate = history.some(
        e =>
            e.role === data.role &&
            e.content.length === data.content.length &&
            e.content.every((p, i) => p.text === data.content[i]?.text && p.media?.url === data.content[i]?.media?.url),
    )

    if (!isDuplicate) history.push(data)

    const isGlobalDuplicate = GlobalHistory.some(
        e =>
            e.role === data.role &&
            e.content.length === data.content.length &&
            e.content.every((p, i) => p.text === data.content[i]?.text && p.media?.url === data.content[i]?.media?.url),
    )

    if (!isGlobalDuplicate) GlobalHistory.push(data)

    if (trim) {
        trimHistory(GlobalHistory, MaxGlobalHistoryLength)
        trimHistory(history, MaxHistoryLength)
    }
}

export function historyWithGlobalContext(history: MessageData) {
    const messages = [...history]

    // Add global history into local history if not already present
    for (const msg of GlobalHistory) {
        const alreadyExists = messages.some(
            m =>
                m.role === msg.role &&
                m.content.length === msg.content.length &&
                m.content.every((p, i) => p.text === msg.content[i]?.text),
        )

        if (!alreadyExists) messages.push(msg)
    }

    // Try to sort by creation time
    messages.sort((a, b) => (Number(a.metadata?.created) || 0) - (Number(b.metadata?.created) || 0))

    // First content should be user message
    while (messages[0]?.role !== 'user') messages.shift()

    return messages.slice(-HistoryReset)
}

export function trimHistory(history: MessageData, maxLength: number) {
    const dateThreshold = Date.now() - MaxHistoryEntryExpiry
    while (history[0] && (Number(history[0].metadata?.created) || 0) < dateThreshold) {
        history.shift()
    }

    if (history.length > maxLength) history.splice(0, history.length - maxLength)
}

function sanitizeMessage(content: string) {
    return content.replaceAll(HistoryEntrySeparator, '. ').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function sanitizeAttr(value: string) {
    return value.replaceAll('"', '').replaceAll('<', '').replaceAll('>', '')
}
