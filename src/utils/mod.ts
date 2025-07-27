import { config, log } from '~/context'
import { lowFootprintReaderToBuffer } from './buffers'
import { getChannel } from './channels'
import { field } from './embeds'
import type { Attachment, Embed, File, Message, MessageAttachment, TextChannel, ThreadChannel } from 'oceanic.js'

const LogTag = 'utils/mod'

export async function sendModerationLog(
    embed: Embed,
    guildId: string,
    msg?: Message,
    proofs?: Array<Attachment | undefined>,
) {
    const channel = await getLogChannelOrThread(guildId)
    if (!channel) return

    embed.fields ??= []
    if (msg) embed.fields.push(field('Reference', msg.jumpLink))

    const attachments: MessageAttachment[] = []
    // biome-ignore lint/suspicious/noConfusingVoidType: Don't see how this is confusing here
    const pFiles: Promise<File | void>[] = []

    if (proofs)
        for (const [id, proof] of proofs.entries())
            if (proof)
                pFiles.push(
                    fetch(proof.url)
                        .then(async res => {
                            if (!res.body) throw new Error('No request body')

                            return {
                                name: proof.filename,
                                index: id,
                                contents: await lowFootprintReaderToBuffer(res.body.getReader(), proof.size),
                            }
                        })
                        .catch(err => {
                            log.error(LogTag, `Failed to fetch proof file ${proof.url}: ${err}`)
                        })
                        .finally(() => {
                            attachments.push({ id })
                        }),
                )

    await channel.createMessage({
        embeds: [embed],
        files: (await Promise.all(pFiles)).filter(Boolean) as File[],
        attachments,
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
