import { type CommandInteraction, InteractionContextTypes, InteractionTypes, MessageFlags } from 'oceanic.js'
import { inspect } from 'util'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { Command, CommandTriggers } from '~/classes/commands/Command'
import { Emojis } from '~/constants'
import { bot, commands, log } from '~/context'
import { emoji } from '~/utils/formatters'
import { handleChatCommandError } from '../_shared'
import type { ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'

const EventName = 'interactionCreate'
const EventHandlerName = 'command'
const LogTag = `events/${EventName}/${EventHandlerName}`

bot.on(EventName, async intr => {
    if (!intr.isCommandInteraction() || intr.type !== InteractionTypes.APPLICATION_COMMAND) return

    const { name } = intr.data
    const cmd = commands.get(name)
    if (!cmd) return log.warn(LogTag, `Command ${name} registered but not implemented!`)
    if (!(cmd instanceof ChatCommand)) return log.error(LogTag, `Command ${name} is not a chat command!`, inspect(cmd))

    if (
        !Command.canExecuteViaTrigger(cmd, CommandTriggers.PlatformImplementation) ||
        !Command.canExecuteInContext(cmd, intr.guildID ? InteractionContextTypes.GUILD : InteractionContextTypes.BOT_DM)
    )
        return await intr.reply({
            content: emoji(Emojis.denied),
            flags: MessageFlags.EPHEMERAL,
        })

    const ctx: ChatCommandExecuteContext<CommandInteraction<any>> = {
        executor: intr.user,
        trigger: intr,
    }

    if (!(await ChatCommand.canExecute(cmd, ctx)))
        return await intr.reply({
            content: emoji(Emojis.denied),
            flags: MessageFlags.EPHEMERAL,
        })

    const actions = ChatCommand.createExecuteActions(intr)

    try {
        const opts = await ChatCommand.optionsFromInteraction(intr, cmd.options)
        log.debug(LogTag, `${intr.user.tag} (${intr.user.id}) executing command:`, cmd.name, inspect(opts))
        await cmd.execute(ctx, opts, actions)
    } catch (err) {
        await handleChatCommandError(err, cmd, intr, actions)
    }
})
