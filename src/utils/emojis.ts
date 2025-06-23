const DiscordCdnEmojiBaseUrl = 'https://cdn.discordapp.com/emojis/'

export function emojiUrl(
    id: string,
    options?: {
        format?: 'png' | 'gif' | 'webp'
        quality?: 'lossless'
        size?: number
    },
): string {
    return `${DiscordCdnEmojiBaseUrl}${id}.${options?.format ?? 'webp'}?quality=${options?.quality ?? 'lossless'}&size=${options?.size ?? 128}`
}
