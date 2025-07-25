import { MaxDuration } from '~/commands/mod/mute'
import { bot, config, log } from '~/context'
import { s, string } from '~/strings'
import { embed, field } from '~/utils/embeds'
import { sendModerationLog } from '~/utils/mod'

const EventName = 'guildMemberAdd'
const EventHandlerName = 'accountAge'
const LogTag = `events/${EventName}/${EventHandlerName}`

bot.on(EventName, async member => {
    const guildConfig = config.mod?.guilds?.[member.guildID]?.minAccountAge
    if (!guildConfig) return

    const createdAtTime = member.createdAt.getTime()
    const requirement = createdAtTime + guildConfig

    if (requirement > Date.now()) {
        const muteUntil = new Date(Math.min(requirement, Date.now() + MaxDuration.offset)).toISOString()

        log.warn(
            LogTag,
            `Member ${member.tag} (${member.id}) in guild ${member.guildID} does not meet account age requirement. Muting until: ${muteUntil}.`,
        )

        await member.edit({
            communicationDisabledUntil: muteUntil,
        })

        const timestamp = Math.ceil(requirement / 1000)

        await sendModerationLog(
            embed({
                title: string(s.command.mute.action, member.tag),
                fields: [
                    field(string(s.generic.member), member.mention),
                    field(
                        string(s.generic.reason),
                        string(s.command.mute.reason.accountTooNew, Math.ceil(createdAtTime / 1000)),
                        true,
                    ),
                    field(string(s.generic.expires), `<t:${timestamp}> (<t:${timestamp}:R>)`, true),
                ],
            }),
            member.guildID,
        )
    }
})
