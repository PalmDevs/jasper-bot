import { ApplicationCommandOptionTypes, InteractionContextTypes, MessageFlags } from 'oceanic.js'
import { inspect } from 'util'
import { ChatCommand } from '~/classes/commands/ChatCommand'
import { DefaultCommandIntegrationTypes, DefaultCommandTriggers } from '~/classes/commands/Command'
import { s, string } from '~/strings'
import { AdminOnlyAccess } from '~/utils/commands'
import { embed } from '~/utils/embeds'
import { codeblock, subtext } from '~/utils/formatters'

export default new ChatCommand({
    name: 'eval',
    description: 'Make me less sentient.',
    options: [
        {
            name: 'code',
            description: 'What do I run?',
            type: ApplicationCommandOptionTypes.STRING,
            required: true,
        },
        {
            name: 'depth',
            description: 'How much depth to inspect the result? (Default: 3)',
            type: ApplicationCommandOptionTypes.INTEGER,
            required: false,
        },
    ],
    triggers: DefaultCommandTriggers,
    contexts: [InteractionContextTypes.BOT_DM],
    integrationTypes: DefaultCommandIntegrationTypes,
    access: AdminOnlyAccess,
    // biome-ignore lint/correctness/noUnusedFunctionParameters: To be used in eval()
    async execute(context, options, actions) {
        // biome-ignore lint/security/noGlobalEval: This is for admin use only
        const output = await eval(options.code)
        const result = inspect(output, {
            depth: options.depth ?? 3,
            getters: true,
            numericSeparator: true,
            showProxy: true,
            showHidden: true,
        })

        const evalEmbed = embed({
            title: string(s.generic.result),
            description:
                result.length > 1900 ? subtext(string(s.command.eval.outputTooLarge)) : codeblock(result, 'js'),
        })

        await actions.reply({
            embeds: [evalEmbed],
            files:
                result.length > 1900
                    ? [
                          {
                              name: string(s.command.eval.outputFileName),
                              contents: Buffer.from(result),
                          },
                      ]
                    : undefined,
            flags: MessageFlags.EPHEMERAL,
        })
    },
})
