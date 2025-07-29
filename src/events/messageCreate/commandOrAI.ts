import { InteractionContextTypes, type Message } from 'oceanic.js'
import { inspect } from 'util'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { Command, CommandTriggers } from '~/classes/commands/Command'
import { Emojis } from '~/constants'
import { bot, commands, config, log } from '~/context'
import { respondFromMessage } from '~/utils/ai'
import { adminOnlyPreciate, moderatorOnlyPreciate } from '~/utils/commands'
import { parseArguments } from '~/utils/parsers'
import { handleChatCommandError } from '../_shared'
import type { ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'

const EventName = 'messageCreate'
const EventHandlerName = 'commandOrAI'
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
        if (mentions) await respondWithAI(msg)
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

// TODO: Move this somewhere that we can share with the `hello` and `is` command.
async function respondWithAI(msg: Message) {
    if (msg.guildID) {
        if (!config.ai?.guilds[msg.guildID]) return
    } else if (!config.ai?.dm) return

    const context = { trigger: msg, executor: msg.author } as ChatCommandExecuteContext

    // TODO: Remove this
    if ((await adminOnlyPreciate(context)) || (await moderatorOnlyPreciate(context)))
        await respondFromMessage(msg).catch(err => {
            log.error(LogTag, `Error responding to message ${msg.id} with AI:`, err)
            msg.createReaction(Emojis.denied).catch(err =>
                log.error(LogTag, `Failed to react to message ${msg.id}:`, err),
            )
        })
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
