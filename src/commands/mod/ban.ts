import { ApplicationCommandOptionTypes, ApplicationIntegrationTypes, InteractionContextTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionsWithReadMessageReferenceMode } from '~/classes/commands/ChatCommandConstants'
import { DefaultCommandTriggers } from '~/classes/commands/Command'
import { SelfError } from '~/classes/Error'
import { s, string } from '~/strings'
import { durationOptionResolver, ModeratorOnlyAccess } from '~/utils/commands'
import { embed, field } from '~/utils/embeds'
import { subtext } from '~/utils/formatters'
import { getMember, isMemberManageable } from '~/utils/guilds'
import { sendModerationLog } from '~/utils/mod'

const MaxDuration = 6048e5

export default new ChatCommand({
    name: 'ban',
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
            name: 'proof',
            type: ApplicationCommandOptionTypes.ATTACHMENT,
            description: 'Any proof?',
        },
        {
            name: 'proof_2',
            type: ApplicationCommandOptionTypes.ATTACHMENT,
            description: 'Any more proof?',
        },
        {
            name: 'proof_3',
            type: ApplicationCommandOptionTypes.ATTACHMENT,
            description: "Alright, I think that's enough?",
        },
        {
            name: 'proof_4',
            type: ApplicationCommandOptionTypes.ATTACHMENT,
            description: 'How many do you want to put?',
        },
        {
            name: 'dmd',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'How much to clean up?',
            resolver: durationOptionResolver({
                skipInvalid: true,
                min: 1000,
                max: MaxDuration,
            }),
        },
        {
            name: 'reason',
            type: ApplicationCommandOptionTypes.STRING,
            description: 'What for?',
            greedy: true,
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, { user, dmd, proof, proof_2, proof_3, proof_4, reason }, actions) {
        const member = await getMember(context.trigger.guildID, user.id)
        if (member && !(await isMemberManageable(member)))
            throw new SelfError(string(s.generic.command.error.user.notManageable, member.mention))

        await user.client.rest.guilds.createBan(context.trigger.guildID, user.id, {
            deleteMessageSeconds: dmd && dmd.offset / 1000,
            reason,
        })

        const banEmbed = embed({
            title: string(s.command.ban.action, user.tag),
            fields: [
                field(string(s.generic.user), user.mention),
                field(string(s.generic.moderator), context.executor.mention, true),
                field(string(s.generic.reason), reason ?? subtext(string(s.generic.command.default.reason)), true),
            ],
        })

        await sendModerationLog(
            banEmbed,
            context.trigger.guildID,
            await actions.reply({
                embeds: [banEmbed],
            }),
            [proof, proof_2, proof_3, proof_4],
        )
    },
})
