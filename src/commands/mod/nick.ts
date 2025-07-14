import { ApplicationCommandOptionTypes, ApplicationIntegrationTypes, InteractionContextTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionsWithReadMessageReferenceMode } from '~/classes/commands/ChatCommandConstants'
import { DefaultCommandTriggers } from '~/classes/commands/Command'
import { SelfError, UserError } from '~/classes/Error'
import { s, string } from '~/strings'
import { ModeratorOnlyAccess } from '~/utils/commands'
import { embed, field } from '~/utils/embeds'
import { getMember, isMemberManageable } from '~/utils/guilds'
import { sendModerationLog } from '~/utils/mod'

export default new ChatCommand({
    name: 'nick',
    description: "Somebody causin' trouble?",
    aliases: ['gtfo', 'boot', 'murder', 'kill', 'explode'],
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionTypes.USER,
            description: 'Who?',
            readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Prioritize,
            required: true,
        },
        {
            name: 'nick',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'What to set?',
            greedy: true,
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute({ trigger: { guildID }, executor }, { user, nick }, actions) {
        const member = await getMember(guildID, user.id)
        if (!member) throw new UserError(string(s.generic.command.error.user.notInGuild, user.mention))
        if (await isMemberManageable(member))
            throw new SelfError(string(s.generic.command.error.user.notManageable, member.mention))

        await member.edit({
            nick: nick || null,
        })

        const nickEmbed = embed({
            title: string(s.command.nick.action, member.tag),
            fields: [
                field(string(s.generic.user), member.mention, true),
                field(string(s.generic.nickname), nick || string(s.command.nick.reset), true),
                field(string(s.generic.moderator), executor.mention),
            ],
        })

        await sendModerationLog(
            nickEmbed,
            await actions.reply({
                embeds: [nickEmbed],
            }),
        )
    },
})
