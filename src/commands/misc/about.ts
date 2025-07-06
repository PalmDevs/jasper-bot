import { MessageFlags } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { CommandTriggers, DefaultCommandContexts, DefaultCommandIntegrationTypes } from '~/classes/commands/Command'
import { Product } from '~/constants'
import { s, string } from '~/strings'
import { embed, field } from '~/utils/embeds'

export default new ChatCommand({
    name: 'about',
    description: 'Who am I?',
    aliases: ['who', 'who?'],
    options: [],
    triggers: [
        CommandTriggers.PlatformImplementation,
        CommandTriggers.ChatMessage,
        CommandTriggers.ChatMessagePrefixless,
    ],
    contexts: DefaultCommandContexts,
    integrationTypes: DefaultCommandIntegrationTypes,
    async execute(context, _options, actions) {
        const { client } = context.trigger
        const started = Math.ceil(client.startTime / 1000)

        await actions.reply({
            embeds: [
                embed({
                    title: string(s.command.who.title),
                    description: string(s.command.who.description),
                    thumbnail: client.user.avatarURL(),
                    fields: [
                        field(string(s.command.who.version), Product.version, true),
                        field(string(s.command.who.uptime), `<t:${started}> (<t:${started}:R>)`, true),
                    ],
                }),
            ],
            flags: MessageFlags.EPHEMERAL,
        })
    },
})
