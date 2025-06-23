import { ApplicationCommandOptionTypes, ApplicationIntegrationTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { AnyCommandContexts, AnyCommandTriggers } from '~/classes/commands/Command'
import { AdminOnlyAccess } from '~/utils/commands'

export default new ChatCommand({
    name: 'register',
    description: 'Register commands as application commands.',
    aliases: [],
    options: [
        {
            name: 'guild',
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            description: 'Register commands in this guild',
        },
        {
            name: 'global',
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            description: 'Register commands globally',
        },
    ],
    triggers: AnyCommandTriggers,
    contexts: AnyCommandContexts,
    integrationTypes: [ApplicationIntegrationTypes.USER_INSTALL],
    access: AdminOnlyAccess,
    async execute(_context, _options, _actions) {},
})
