import { log } from '~/context'
import { getChannel, isTextableChannel, type TextableChannel } from './channels'
import type { Message } from 'oceanic.js'

export async function getMessageReference(msg: Message): Promise<Message | null> {
    if (msg.messageReference) {
        const channel = await getChannel(msg.messageReference.channelID!)
        if (channel && isTextableChannel(channel)) return await getMessage(channel, msg.messageReference.messageID!)
    }

    return null
}

export async function getMessage(channel: TextableChannel, id: string): Promise<Message | null> {
    try {
        return channel.messages.get(id) ?? (await channel.getMessage(id))
    } catch (e) {
        log.trace('getMessage', 'Failed to get message:', id, e)
        return null
    }
}
