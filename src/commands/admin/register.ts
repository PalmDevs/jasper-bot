import { ApplicationIntegrationTypes, MessageFlags } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { AnyCommandContexts, AnyCommandTriggers, Command, CommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'
import { AdminOnlyAccess } from '~/utils/commands'
import { cmds } from '../_all'

export default new ChatCommand({
    name: 'register',
    description: 'Register commands as application commands.',
    aliases: [],
    options: [],
    triggers: AnyCommandTriggers,
    contexts: AnyCommandContexts,
    integrationTypes: [ApplicationIntegrationTypes.USER_INSTALL],
    access: AdminOnlyAccess,
    async execute(context, _options, actions) {
        await context.trigger.client.application.bulkEditGlobalCommands(
            cmds
                .filter(cmd => Command.canExecuteViaTrigger(cmd, CommandTriggers.PlatformImplementation))
                .map(cmd => (cmd.constructor as typeof Command).toApplicationCommand(cmd)),
        )

        await actions.reply({
            content: string(s.command.register.success),
            flags: MessageFlags.EPHEMERAL,
        })
    },
})
