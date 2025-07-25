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
    name: 'unmute',
    description: 'Accidentally shut someone up by mistake?',
    aliases: ['unstfu', 'unshutup', 'unshut'],
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionTypes.USER,
            description: 'Who?',
            readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Prioritize,
            required: true,
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute({ executor, trigger }, { user }, actions) {
        const member = await getMember(trigger.guildID, user.id)
        if (!member) throw new UserError(string(s.generic.command.error.user.notInGuild, user.mention))
        if (!(await isMemberManageable(member)))
            throw new SelfError(string(s.generic.command.error.user.notManageable, member.mention))

        await member.edit({
            communicationDisabledUntil: null,
        })

        const unmuteEmbed = embed({
            title: string(s.command.unmute.action, member.tag),
            fields: [
                field(string(s.generic.member), member.mention),
                field(string(s.generic.moderator), executor.mention, true),
            ],
        })

        await sendModerationLog(
            unmuteEmbed,
            trigger.guildID,
            await actions.reply({
                embeds: [unmuteEmbed],
            }),
        )
    },
})
