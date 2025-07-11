import { type CommandInteraction, Message, MessageFlags } from 'oceanic.js'
import { SelfError, UserError, UserErrorType } from '~/classes/Error'
import { Emojis, Illustrations } from '~/constants'
import { log } from '~/context'
import { s, string } from '~/strings'
import { embed, field } from '~/utils/embeds'
import { bold } from '~/utils/formatters'
import type { AnyChatCommand, ChatCommandExecuteActions } from '~/classes/commands/ChatCommand'

const LogTag = 'events/_shared'

export async function handleChatCommandError(
    err: unknown,
    cmd: AnyChatCommand,
    trigger: Message | CommandInteraction,
    actions: ChatCommandExecuteActions,
) {
    const isUserError = err instanceof UserError
    const isSelfError = err instanceof SelfError

    try {
        if (isUserError || isSelfError) {
            const isUsageError = isUserError && err.type === UserErrorType.Usage

            const errorEmbed = embed({
                title: string(isUserError ? s.error.user : s.error.self),
                description: err.message,
                color: 'error',
                fields: isUsageError
                    ? [
                          field(
                              string(s.generic.usage),
                              `${bold(cmd.name)} ${cmd.options
                                  .map(opt => {
                                      const info = `${bold(opt.name)}: ${string(s.generic.command.option[opt.type])}`
                                      return opt.required ? `<${info}>` : `[${info}]`
                                  })
                                  .join(' ')}`,
                          ),
                      ]
                    : undefined,
                thumbnail: isUsageError ? Illustrations.Confused : undefined,
            })

            return await actions.reply({
                embeds: [errorEmbed],
                flags: MessageFlags.EPHEMERAL,
            })
        }

        log.error(LogTag, 'Something blew up while running a command:\n', err)
        await actions.reply({
            embeds: [
                embed({
                    title: string(s.error.generic),
                    description: string(s.error.stack, String(err)),
                    thumbnail: Illustrations.Error,
                    color: 'error',
                }),
            ],
            flags: MessageFlags.EPHEMERAL,
        })
    } catch {
        if (trigger instanceof Message)
            await trigger.client.rest.channels.createReaction(trigger.channelID, trigger.id, Emojis.error).catch()
    }
}
