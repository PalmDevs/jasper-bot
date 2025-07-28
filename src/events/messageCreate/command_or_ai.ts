import assert from 'assert'
import { InteractionContextTypes, type Message } from 'oceanic.js'
import { inspect } from 'util'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { Command, CommandTriggers } from '~/classes/commands/Command'
import { Emojis } from '~/constants'
import { bot, commands, config, log } from '~/context'
import { generateFromMessage } from '~/utils/ai'
import { getChannel, isTextableChannel } from '~/utils/channels'
import { parseArguments } from '~/utils/parsers'
import { handleChatCommandError } from '../_shared'
import type { ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'

const EventName = 'messageCreate'
const EventHandlerName = 'command'
const LogTag = `events/${EventName}/${EventHandlerName}`

bot.on(EventName, async msg => {
    if (msg.author.bot) return

    const [content, replyMentions, mentions] = getActualMessageContentAndTriggerInfo(msg)
    if (content === undefined) return

    let cmdName = ''
    let i = 0
    while (i < content.length) {
        const char = content[i++]
        if (char === ' ') break
        cmdName += char
    }

    cmdName = cmdName.toLowerCase()

    const cmd = commands.get(cmdName)
    if (!cmd) {
        if (mentions) await respondWithAi(msg)
        return
    }

    if (!(cmd instanceof ChatCommand))
        return log.error(LogTag, `Command ${cmdName} is not a chat command!`, inspect(cmd))

    if (
        !Command.canExecuteViaTrigger(
            cmd,
            replyMentions ? CommandTriggers.ChatMessagePrefixless : CommandTriggers.ChatMessage,
        ) ||
        !Command.canExecuteInContext(cmd, msg.guildID ? InteractionContextTypes.GUILD : InteractionContextTypes.BOT_DM)
    )
        return

    const args = content.slice(cmdName.length)

    const ctx: ChatCommandExecuteContext<any> = {
        commandName: replyMentions ? '' : cmdName,
        executor: msg.author,
        trigger: msg,
    }

    if (!(await ChatCommand.canExecute(cmd, ctx))) return await msg.createReaction(Emojis.denied)

    const actions = ChatCommand.createExecuteActions(msg)

    try {
        const opts = await ChatCommand.optionsFromMessage(msg, parseArguments(args), cmd.options)
        log.debug(LogTag, `${msg.author.tag} (${msg.author.id}) executing command:`, cmd.name, inspect(opts))
        await cmd.execute(ctx, opts, actions)
    } catch (err) {
        await handleChatCommandError(err, cmd, msg, actions)
    }
})

async function respondWithAi(msg: Message) {
    const channel = await getChannel(msg.channelID)
    assert(channel && isTextableChannel(channel), 'Channel not available or is not textable')
    if (!('guildID' in channel)) {
        if (!config.ai?.dm) return
    } else if (!config.ai?.guilds[channel.guildID]) return

    await channel.sendTyping()
    log.debug(LogTag, `Generating AI response for message ${msg.id}`)

    try {
        const content = await generateFromMessage(msg)
        log.debug(LogTag, `AI response generated for message ${msg.id}:`, content)

        await channel.createMessage({
            messageReference: {
                failIfNotExists: true,
                messageID: msg.id,
            },
            content,
        })
    } catch (e) {
        log.error(LogTag, `Failed to generate AI response for message ${msg.id}:`, e)
        await msg.createReaction(Emojis.mentioned)
    }
}

function getActualMessageContentAndTriggerInfo(
    msg: Message,
): [] | [content: string, replyMentions: boolean, mentions: boolean] {
    const { content } = msg
    let prefixLength = 0

    for (const prefix of config.prefix.matches)
        if (content.startsWith(prefix)) {
            prefixLength = prefix.length
            break
        }

    if (prefixLength) return [content.slice(prefixLength).trimStart(), false, false]

    if (config.prefix.mentions) {
        const id = msg.client.user.id
        const mention = `<@${id}>`
        if (content.startsWith(mention)) return [content.slice(mention.length).trimStart(), false, true]

        if (msg.mentions.users.some(u => u.id === id)) {
            // If we don't have a message reference, it's a manual mention, so we remove the last mention from the content
            if (!msg.messageReference) {
                const lastMentionIndex = content.lastIndexOf(mention)
                if (lastMentionIndex >= 0)
                    return [
                        content.substring(0, lastMentionIndex) +
                            content.substring(lastMentionIndex + mention.length, content.length).trimEnd(),
                        true,
                        true,
                    ]
            }

            return [content, true, true]
        }
    }

    return []
}
