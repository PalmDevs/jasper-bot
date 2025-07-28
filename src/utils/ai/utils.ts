import { config } from '~/context'
import { moderatorOnlyPreciate } from '../commands'
import { getMessage } from '../messages'
import { GlobalHistory, MaxLinkFollow, TagAdmin, TagModerator } from './constants'
import type { Message } from 'oceanic.js'
import type { ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'
import type { MessageData } from './types'

export async function formatMessage(msg: Message, recurse = MaxLinkFollow, linked = false): Promise<string> {
    const { author: user } = msg
    const { username: uname, id: uid, tag: utag } = user

    const tags: string[] = []

    if (config.admin.users.includes(uid)) tags.push(TagAdmin)
    if (msg.guildID && (await moderatorOnlyPreciate({ executor: user, trigger: msg } as ChatCommandExecuteContext)))
        tags.push(TagModerator)

    const node = linked ? 'linked' : 'message'

    let contentText = `<${node} name="${sanitizeAttribute(uname)}" full_name="${sanitizeAttribute(utag)}" tags="${tags.join(', ')}">\n`
    contentText += sanitizeValue(msg.content)
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
