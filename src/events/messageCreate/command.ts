import { InteractionContextTypes } from 'oceanic.js'
import { inspect } from 'util'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { Command, CommandTriggers } from '~/classes/commands/Command'
import { Emojis } from '~/constants'
import { bot, commands, config, log } from '~/context'
import { parseArguments } from '~/utils/parsers'
import { handleChatCommandError } from '../_shared'
import type { AnyChatCommand, ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'

const EventName = 'messageCreate'
const LogTag = `events/${EventName}`

bot.on(EventName, async msg => {
    if (msg.author.bot) return

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

    if (!prefixLength) return

    const content = msg.content.slice(prefixLength).trimStart()
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

    if (
        !Command.canExecuteViaTrigger(cmd, CommandTriggers.ChatMessage) ||
        !Command.canExecuteInContext(cmd, msg.guildID ? InteractionContextTypes.GUILD : InteractionContextTypes.BOT_DM)
    )
        return

    const args = content.slice(cmdName.length)

    switch (cmd.constructor) {
        case ChatCommand: {
            const c = cmd as AnyChatCommand

            const ctx: ChatCommandExecuteContext<any> = {
                executor: msg.author,
                trigger: msg,
            }

            if (!(await ChatCommand.canExecute(c, ctx))) return msg.createReaction(Emojis.denied)

            const actions = ChatCommand.createExecuteActions(msg)

            try {
                const opts = await ChatCommand.optionsFromMessage(msg, parseArguments(args), c.options)
                log.debug(LogTag, `${msg.author.tag} (${msg.author.id}) executing command:`, c.name, inspect(opts))
                await c.execute(ctx, opts, actions)
            } catch (err) {
                await handleChatCommandError(c, err, actions)
            }
        }
    }
})
