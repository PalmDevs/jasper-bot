import { ApplicationCommandOptionTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionsWithReadMessageReferenceMode } from '~/classes/commands/ChatCommandConstants'
import { AnyCommandContexts, AnyCommandIntegrationTypes, AnyCommandTriggers } from '~/classes/commands/Command'

export default new ChatCommand({
    name: 'avatar',
    description: "Get somebody's avatar.",
    aliases: ['pfp'],
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionTypes.USER,
            description: 'The user to view the avatar of',
            readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Fallback,
        },
    ],
    triggers: AnyCommandTriggers,
    contexts: AnyCommandContexts,
    integrationTypes: AnyCommandIntegrationTypes,
    async execute(context, options, actions) {
        await actions.reply({
            content: (options.user ?? context.executor).avatarURL(),
        })
    },
})
