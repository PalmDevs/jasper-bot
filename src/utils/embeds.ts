import { EmojiIds, type ProductColorResolvable, ProductColors } from '~/constants'
import { emojiUrl } from './emojis'
import type { Embed, EmbedField, EmbedFooter } from 'oceanic.js'

export function embed({
    title,
    description,
    color,
    fields,
    footer,
    image,
    thumbnail,
}: {
    title?: string
    description?: string
    color?: ProductColorResolvable
    fields?: EmbedField[]
    footer?: EmbedFooter
    image?: string
    thumbnail?: string
}): Embed {
    return {
        title,
        description,
        color: color ? ProductColors[color] : ProductColors.primary,
        fields,
        footer,
        image: image ? { url: image } : undefined,
        thumbnail: thumbnail ? { url: thumbnail } : undefined,
    }
}

export function footer(text: string, iconURL?: string): EmbedFooter {
    return {
        text,
        iconURL:
            iconURL ??
            emojiUrl(EmojiIds.jasper_head, {
                size: 32,
            }),
    }
}

export function field(name: string, inline: boolean): EmbedField
export function field(name: string, value: string): EmbedField
export function field(name: string, value: string, inline: boolean): EmbedField
export function field(name: string, valueOrInline: string | boolean, inline?: boolean): EmbedField {
    return {
        name,
        value: typeof valueOrInline === 'string' ? valueOrInline : '\u200b',
        inline: typeof valueOrInline === 'boolean' ? valueOrInline : inline,
    }
}
