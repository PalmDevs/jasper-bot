import { ApplicationCommandOptionTypes, ApplicationIntegrationTypes, InteractionContextTypes } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { ChatCommandOptionsWithReadMessageReferenceMode } from '~/classes/commands/ChatCommandConstants'
import { AnyCommandTriggers } from '~/classes/commands/Command'
import { Illustrations } from '~/constants'
import { s, string } from '~/strings'
import { ModeratorOnlyAccess } from '~/utils/commands'
import { embed, field } from '~/utils/embeds'
import { sendModerationLog } from '~/utils/mod'

export default new ChatCommand({
    name: 'role',
    description: "Manage somebody's roles.",
    options: [
        {
            name: 'add',
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            description: 'Add a role to a user',
            aliases: new Set(['+', 'a']),
            options: [
                {
                    name: 'role',
                    type: ApplicationCommandOptionTypes.ROLE,
                    description: 'The role to add',
                    required: true,
                },
                {
                    name: 'user',
                    type: ApplicationCommandOptionTypes.USER,
                    description: 'The user to add the role to',
                    required: true,
                    readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Fallback,
                },
            ],
        },
        {
            name: 'remove',
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            description: 'Remove a role from a user',
            aliases: new Set(['-', 'r']),
            options: [
                {
                    name: 'role',
                    type: ApplicationCommandOptionTypes.ROLE,
                    description: 'The role to remove',
                    required: true,
                },
                {
                    name: 'user',
                    type: ApplicationCommandOptionTypes.USER,
                    description: 'The user to remove the role from',
                    required: true,
                    readMessageReference: ChatCommandOptionsWithReadMessageReferenceMode.Fallback,
                },
            ],
        },
    ],
    access: ModeratorOnlyAccess,
    triggers: AnyCommandTriggers,
    contexts: [InteractionContextTypes.GUILD],
    integrationTypes: [ApplicationIntegrationTypes.GUILD_INSTALL],
    async execute(context, options, actions) {
        const { trigger, executor } = context
        const { client } = trigger
        const { user, role } = (options.add ?? options.remove)!

        const reason = string(s.command.role.reason, executor.tag, executor.id)

        if (options.add) await client.rest.guilds.addMemberRole(trigger.guildID!, user.id, role.id, reason)
        else if (options.remove) await client.rest.guilds.removeMemberRole(trigger.guildID!, user.id, role.id, reason)

        const roleEmbed = embed({
            title: string(s.command.role[options.add ? 'added' : 'removed']),
            thumbnail: options.add ? Illustrations.RoleAdded : Illustrations.RoleRemoved,
            fields: [
                field(string(s.generic.user), user.mention, true),
                field(string(s.generic.role), role.mention, true),
                field(string(s.generic.moderator), executor.mention),
            ],
        })

        await sendModerationLog(
            roleEmbed,
            await actions.reply({
                embeds: [roleEmbed],
            }),
        )
    },
})
