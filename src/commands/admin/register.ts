import { InteractionContextTypes, MessageFlags } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import {
    Command,
    CommandTriggers,
    DefaultCommandIntegrationTypes,
    DefaultCommandTriggers,
} from '~/classes/commands/Command'
import { log } from '~/context'
import { s, string } from '~/strings'
import { AdminOnlyAccess } from '~/utils/commands'
import { cmds } from '../_all'

export default new ChatCommand({
    name: 'register',
    description: 'Register commands as application commands.',
    aliases: [],
    options: [],
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.BOT_DM],
    integrationTypes: DefaultCommandIntegrationTypes,
    access: AdminOnlyAccess,
    async execute(context, _options, actions) {
        const appCommands = cmds
            .filter(cmd => Command.canExecuteViaTrigger(cmd, CommandTriggers.PlatformImplementation))
            .map(cmd => (cmd.constructor as typeof Command).toApplicationCommand(cmd))

        await context.trigger.client.application.bulkEditGlobalCommands(appCommands)

        log.info('commands/admin/register', string(s.command.register.info, appCommands.length), appCommands)

        await actions.reply({
            content: string(s.command.register.success),
            flags: MessageFlags.EPHEMERAL,
        })
    },
})
