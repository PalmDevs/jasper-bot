import { type AnyChannel, type TextableChannels, TextableChannelTypes } from 'oceanic.js'
import { bot, log } from '~/context'

export type TextableChannel = Extract<AnyChannel, { type: TextableChannels }>

export function isTextableChannel(channel: AnyChannel): channel is TextableChannel {
    // @ts-expect-error
    return TextableChannelTypes.includes(channel.type)
}

export async function getChannel(channelId: string) {
    try {
        const channel = bot.getChannel(channelId) ?? (await bot.rest.channels.get(channelId))
        return channel
    } catch (e) {
        log.trace('getChannel', 'Failed to get channel:', channelId, e)
        return null
    }
}
