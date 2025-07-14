import { config } from '~/context'
import { getChannel } from './channels'
import { field } from './embeds'
import type { Embed, Message, TextChannel, ThreadChannel } from 'oceanic.js'

export async function sendModerationLog(embed: Embed, msg: Message, proofUrl?: string) {
    const channel = await getLogChannelOrThread(msg.guildID!)
    if (!channel) return

    embed.fields ??= []
    embed.fields.push(field('Reference', msg.jumpLink))
    if (proofUrl) embed.image = { url: proofUrl }

    await channel.createMessage({
        embeds: [embed],
    })
}

export async function getLogChannelOrThread(guildID: string): Promise<TextChannel | ThreadChannel | null> {
    const cfg = config.mod?.guilds[guildID]?.log
    if (!cfg) return null

    try {
        const channel = (await getChannel(cfg.thread ?? cfg.channel)) as TextChannel | ThreadChannel | null
        if (!channel) return null

        return channel
    } catch (error) {
        console.error(`Failed to get log channel for guild ${guildID}:`, error)
        return null
    }
}
