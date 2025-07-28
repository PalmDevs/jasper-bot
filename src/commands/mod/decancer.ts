import {
    ApplicationCommandOptionTypes,
    ApplicationIntegrationTypes,
    InteractionContextTypes,
    MessageFlags,
} from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionsWithReadMessageReferenceMode } from '~/classes/commands/ChatCommandConstants'
import { DefaultCommandTriggers } from '~/classes/commands/Command'
import { SelfError, UserError } from '~/classes/Error'
import { s, string } from '~/strings'
import { ModeratorOnlyAccess } from '~/utils/commands'
import { embed, field } from '~/utils/embeds'
import { decancerMember, getMember, isMemberManageable } from '~/utils/guilds'

export default new ChatCommand({
    name: 'decancer',
    description: 'Somebody has a shitty nickname?',
    aliases: ['dc'],
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
    async execute({ trigger: { guildID } }, { user }, actions) {
        const member = await getMember(guildID, user.id)
        if (!member) throw new UserError(string(s.generic.command.error.user.notInGuild, user.mention))
        if (!(await isMemberManageable(member)))
            throw new SelfError(string(s.generic.command.error.user.notManageable, member.mention))

        const nick = await decancerMember(member)

        await actions.reply({
            embeds: [
                embed({
                    title: string(s.command.decancer.action, member.tag),
                    fields: [
                        field(string(s.generic.user), member.mention, true),
                        field(string(s.generic.nickname), nick || string(s.command.decancer.noResult), true),
                    ],
                }),
            ],
            flags: MessageFlags.EPHEMERAL,
        })
    },
})
