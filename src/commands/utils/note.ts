import assert from 'assert'
import {
    ApplicationCommandOptionTypes,
    ApplicationIntegrationTypes,
    InteractionContextTypes,
    MessageFlags,
} from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import {
    ChatCommandOptionsWithReadMessageReferenceMode,
    ChatCommandOptionTypes,
} from '~/classes/commands/ChatCommandConstants'
import { DefaultCommandTriggers } from '~/classes/commands/Command'
import { UserError } from '~/classes/Error'
import { bot, config } from '~/context'
import { s, string } from '~/strings'
import { embed } from '~/utils/embeds'
import { getGuild } from '~/utils/guilds'

export default new ChatCommand({
    name: 'note',
    description: 'Send a note when someone keeps asking the same question.',
    options: [
        {
            name: 'note',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'What do I send?',
        },
        {
            name: 'reply_to',
            type: ChatCommandOptionTypes.MESSAGE,
            description: 'What do I reply to?',
            readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Fallback,
        },
    ],
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, options, actions) {
        const { trigger } = context
        const { note: name, reply_to: msg } = options

        const notes = config.notes?.[trigger.guildID]

        const guild = await getGuild(trigger.guildID)
        assert(guild, 'Guild not available')

        if (!notes) throw new UserError(string(s.command.note.error.noConfig, guild.name))
        if (!name)
            return await actions.reply({
                embeds: [
                    embed({
                        title: string(s.command.note.allTitle, guild.name),
                        description: string(s.command.note.all, Object.keys(notes)),
                    }),
                ],
                flags: MessageFlags.EPHEMERAL,
            })

        const note = notes[name]
        if (!note) throw new UserError(string(s.command.note.error.noNote))

        if (msg)
            await bot.rest.channels.createMessage(msg.channelID, {
                ...note,
                messageReference: {
                    messageID: msg.id,
                },
            })
        else await actions.reply(note)
    },
})
