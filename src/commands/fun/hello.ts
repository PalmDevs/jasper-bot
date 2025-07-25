import { setTimeout as setTimeoutPromise } from 'timers/promises'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { CommandTriggers, DefaultCommandContexts, DefaultCommandIntegrationTypes } from '~/classes/commands/Command'
import { config } from '~/context'
import { s, string } from '~/strings'

export default new ChatCommand({
    name: 'hello',
    description: 'Spit it out already.',
    aliases: ['hi', 'hey', 'sup', ''],
    options: [],
    triggers: [CommandTriggers.ChatMessage, CommandTriggers.ChatMessagePrefixless],
    contexts: DefaultCommandContexts,
    integrationTypes: DefaultCommandIntegrationTypes,
    async execute(context, _options, actions) {
        const { trigger } = context

        // If the message is just a prefix and the user does not mention the bot, ignore it
        if (config.prefix.matches.includes(trigger.content) && !trigger.mentions.users.includes(trigger.client.user))
            return

        const { channel } = trigger
        if (channel) await channel.client.rest.channels.sendTyping(channel.id)
        await setTimeoutPromise(500)

        await actions.reply({
            content: string(s.command.hello.action),
        })
    },
})
