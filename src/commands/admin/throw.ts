import { ApplicationCommandOptionTypes, ApplicationIntegrationTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { AnyCommandContexts, AnyCommandTriggers } from '~/classes/commands/Command'
import { SelfError, UserError } from '~/classes/Error'
import { AdminOnlyAccess } from '~/utils/commands'

export default new ChatCommand({
    name: 'throw',
    description: 'Make me throw up.',
    options: [
        {
            name: 'type',
            description: 'What do I throw up?',
            type: ApplicationCommandOptionTypes.STRING,
            choices: [
                {
                    name: 'Error',
                    value: 'e',
                },
                {
                    name: 'UserError',
                    value: 'u',
                },
                {
                    name: 'SelfError',
                    value: 's',
                },
            ],
            required: true,
        },
    ],
    triggers: AnyCommandTriggers,
    contexts: AnyCommandContexts,
    integrationTypes: [ApplicationIntegrationTypes.USER_INSTALL],
    access: AdminOnlyAccess,
    async execute(_context, options) {
        switch (options.type) {
            case 'e':
                throw new Error('Test Error')
            case 'u':
                throw new UserError('Test UserError')
            case 's':
                throw new SelfError('Test SelfError')
        }
    },
})
