import { InteractionContextTypes } from 'oceanic.js'
import { inspect } from 'util'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { Command, CommandTriggers } from '~/classes/commands/Command'
import { Emojis } from '~/constants'
import { bot, commands, config, log } from '~/context'
import { parseArguments } from '~/utils/parsers'
import { handleChatCommandError } from '../_shared'
import type { ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'

const EventName = 'messageCreate'
const EventHandlerName = 'command'
const LogTag = `events/${EventName}/${EventHandlerName}`

bot.on(EventName, async msg => {
    if (msg.author.bot) return

    let triggeredByReplyMentions = false
    let prefixLength = 0

    if (config.prefix.mentions) {
        const mention = `<@${msg.client.user.id}>`
        if (msg.content.startsWith(mention)) prefixLength = mention.length
    }

    if (!prefixLength)
        for (const prefix of config.prefix.matches) {
            if (msg.content.startsWith(prefix)) {
                prefixLength = prefix.length
                break
            }
        }

    if (!prefixLength && msg.mentions.users.some(u => u.id === msg.client.user.id)) triggeredByReplyMentions = true

    if (!prefixLength && !triggeredByReplyMentions) return

    const content = (prefixLength ? msg.content.slice(prefixLength) : msg.content).trimStart()
    let cmdName = ''

    let i = 0
    while (i < content.length) {
        const char = content[i++]
        if (char === ' ') break
        cmdName += char
    }

    cmdName = cmdName.toLowerCase()

    const cmd = commands.get(cmdName)
    if (!cmd) return
    if (!(cmd instanceof ChatCommand))
        return log.error(LogTag, `Command ${cmdName} is not a chat command!`, inspect(cmd))

    if (
        !Command.canExecuteViaTrigger(
            cmd,
            triggeredByReplyMentions ? CommandTriggers.ChatMessagePrefixless : CommandTriggers.ChatMessage,
        ) ||
        !Command.canExecuteInContext(cmd, msg.guildID ? InteractionContextTypes.GUILD : InteractionContextTypes.BOT_DM)
    )
        return

    const args = content.slice(cmdName.length)

    const ctx: ChatCommandExecuteContext<any> = {
        commandName: triggeredByReplyMentions ? '' : cmdName,
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
