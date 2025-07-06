import { ApplicationCommandOptionTypes, MessageFlags } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionsWithReadMessageReferenceMode } from '~/classes/commands/ChatCommandConstants'
import {
    DefaultCommandContexts,
    DefaultCommandIntegrationTypes,
    DefaultCommandTriggers,
} from '~/classes/commands/Command'

export default new ChatCommand({
    name: 'avatar',
    description: "Get somebody's avatar.",
    aliases: ['pfp'],
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionTypes.USER,
            description: '... of who?',
            readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Fallback,
        },
    ],
    triggers: DefaultCommandTriggers,
    contexts: DefaultCommandContexts,
    integrationTypes: DefaultCommandIntegrationTypes,
    async execute(context, options, actions) {
        await actions.reply({
            content: (options.user ?? context.executor).avatarURL(),
            flags: MessageFlags.EPHEMERAL,
        })
    },
})
