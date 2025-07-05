import { Message } from 'oceanic.js'
import { setTimeout as setTimeoutPromise } from 'timers/promises'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { AnyCommandContexts, AnyCommandIntegrationTypes, CommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'

export default new ChatCommand({
    name: 'hello',
    description: 'Spit it out already.',
    aliases: ['hi', 'hey', 'sup', ''],
    options: [],
    triggers: CommandTriggers.ChatMessage,
    contexts: AnyCommandContexts,
    integrationTypes: AnyCommandIntegrationTypes,
    async execute(context, _options, actions) {
        const { trigger } = context

        if (context.trigger instanceof Message) {
            const { channel } = trigger
            if (channel) await channel.client.rest.channels.sendTyping(channel.id)
            await setTimeoutPromise(500)
        }

        await actions.reply({
            content: string(s.command.hello.response),
        })
    },
})
