import { ApplicationIntegrationTypes, MessageFlags } from 'oceanic.js'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { AnyCommandContexts, AnyCommandTriggers } from '~/classes/commands/Command'
import { log } from '~/context'
import { s, string } from '~/strings'
import { AdminOnlyAccess } from '~/utils/commands'

export default new ChatCommand({
    name: 'stop',
    description: 'Let me finally take a break.',
    aliases: ['die', 'kys'],
    options: [],
    triggers: AnyCommandTriggers,
    contexts: AnyCommandContexts,
    integrationTypes: [ApplicationIntegrationTypes.USER_INSTALL],
    access: AdminOnlyAccess,
    async execute(context, _options, actions) {
        const { executor } = context

        await actions.reply({
            content: string(s.command.stop.response),
            flags: MessageFlags.EPHEMERAL,
        })

        log.warn('commands/stop', `Alright, my job here is done. Thanks to ${executor.tag} (${executor.id}).`)
        process.exit()
    },
})
