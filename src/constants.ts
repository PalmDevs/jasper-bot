import pkg from '../package.json'

export const Product = {
    name: 'Jasper',
    description: pkg.description,
    version: pkg.version,
}

export const ProductColors = {
    primary: 0xf03c2e,
    secondary: 0xadaaaa,
    tertiary: 0x1c253c,
    error: 0xf03c2e,
}

export const EmojiIds = {
    jasper: '1371869037449183322',
    jasper_head: '1371546922715840564',
    mentioned: '1372208643079929917',
    denied: '1372289047665443000',
    error: '1390295190476165140',
}

export const Emojis = new Proxy<Record<keyof typeof EmojiIds, string>>(EmojiIds, {
    get: (target, prop) => {
        if (typeof prop === 'string' && target[prop as keyof typeof target])
            return `${prop}:${target[prop as keyof typeof target]}`
        return undefined
    },
})

export const Illustrations = {
    GetMuted: 'https://cdn.discordapp.com/attachments/1371819477708308581/1371949651275677806/GetMuted.png',
    RoleAdded: 'https://cdn.discordapp.com/attachments/1371819477708308581/1372524378914291782/RoleAdded.png',
    RoleRemoved: 'https://cdn.discordapp.com/attachments/1371819477708308581/1372524378616500345/RoleRemoved.png',
    Error: 'https://cdn.discordapp.com/attachments/1371819477708308581/1390295544043274280/Error.png',
}

export type ProductColorResolvable = keyof typeof ProductColors
