import { config } from '~/context'
import { moderatorOnlyPreciate } from '../commands'
import { getMessage } from '../messages'
import { replaceAllAsync } from '../strings'
import { getUser } from '../users'
import { GlobalHistory, MaxLinkFollow, TagAdmin, TagModel, TagModerator } from './constants'
import type { Message } from 'oceanic.js'
import type { ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'
import type { MessageData } from './types'

const UserMentionRegex = /<@(\d+)>/g

export async function formatMessage(msg: Message, recurse = MaxLinkFollow, linked = false): Promise<string> {
    const { author: user } = msg
    const { globalName: ugname, username: uname, id: uid, tag: utag } = user

    const tags: string[] = []

    if (uid === msg.client.user.id) tags.push(TagModel)
    if (config.admin.users.includes(uid)) tags.push(TagAdmin)
    if (msg.guildID && (await moderatorOnlyPreciate({ executor: user, trigger: msg } as ChatCommandExecuteContext)))
        tags.push(TagModerator)

    const node = linked ? 'linked' : 'message'
    const content = await replaceAllAsync(msg.content, UserMentionRegex, async ([full, id]) => {
        const user = await getUser(id!)
        return user ? `@${user.globalName ?? user.username} (${user.username})` : full!
    })

    let contentText = `<${node} name="${sanitizeAttribute(ugname ?? uname)}" full_name="${sanitizeAttribute(utag)}" tags="${tags.join(', ')}">\n`
    contentText += sanitizeValue(content)
    contentText += `\n</${node}>`

    const reference = msg.messageReference
    if (reference && recurse > 0)
        contentText += `\n\n${await formatMessage((await getMessage(msg.channel!, reference.messageID!))!, recurse - 1, true)}`

    return contentText
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

function sanitizeAttribute(attr: string): string {
    return attr.replaceAll(/"/g, '\\"')
}

function sanitizeValue(content: string): string {
    return content.replaceAll(/([<>])/g, '\\$1')
}
