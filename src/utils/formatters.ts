export function subtext(text: string | number) {
    return `-# ${text}`
}

export function codeblock(text: string | number, lang = 'js') {
    return `\`\`\`${lang}\n${text}\n\`\`\``
}

export function code(text: string | number) {
    return `\`${text}\``
}

export function bold(text: string | number) {
    return `**${text}**`
}
