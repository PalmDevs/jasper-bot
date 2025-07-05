import { type CommandInteraction, InteractionContextTypes, MessageFlags } from 'oceanic.js'
import { inspect } from 'util'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { Command, CommandTriggers } from '~/classes/commands/Command'
import { Emojis } from '~/constants'
import { bot, commands, log } from '~/context'
import { handleChatCommandError } from '../_shared'
import type { AnyChatCommand, ChatCommandExecuteContext } from '~/classes/commands/ChatCommand'

const EventName = 'interactionCreate'
const EventHandlerName = 'command'
const LogTag = `events/${EventName}/${EventHandlerName}`

bot.on(EventName, async intr => {
    if (!intr.isCommandInteraction()) return

    const { name } = intr.data
    const cmd = commands.get(name)
    if (!cmd) return log.warn(LogTag, `Command ${name} registered but not implemented!`)

    intr.defer()

    if (
        !Command.canExecuteViaTrigger(cmd, CommandTriggers.PlatformImplementation) ||
        !Command.canExecuteInContext(cmd, intr.guildID ? InteractionContextTypes.GUILD : InteractionContextTypes.BOT_DM)
    )
        return await intr.createFollowup({
            content: Emojis.denied,
            flags: MessageFlags.EPHEMERAL,
        })

    switch (cmd.constructor) {
        case ChatCommand: {
            const c = cmd as AnyChatCommand

            const ctx: ChatCommandExecuteContext<CommandInteraction<any>> = {
                executor: intr.user,
                trigger: intr,
            }

            if (!(await ChatCommand.canExecute(c, ctx)))
                return await intr.createFollowup({
                    content: Emojis.denied,
                    flags: MessageFlags.EPHEMERAL,
                })

            const actions = ChatCommand.createExecuteActions(intr)

            try {
                const opts = await ChatCommand.optionsFromInteraction(intr, c.options)
                log.debug(LogTag, `${intr.user.tag} (${intr.user.id}) executing command:`, c.name, inspect(opts))
                await c.execute(ctx, opts, actions)
            } catch (err) {
                await handleChatCommandError(err, c, intr, actions)
            }
        }
    }
})
