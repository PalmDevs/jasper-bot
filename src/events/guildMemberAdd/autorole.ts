import { bot, config, log } from '~/context'

const EventName = 'guildMemberAdd'
const EventHandlerName = 'autorole'
const LogTag = `events/${EventName}/${EventHandlerName}`

bot.on(EventName, async member => {
    const guildConfig = config.autorole?.[member.guildID]
    if (!guildConfig || !guildConfig.length) return

    await member.edit({
        roles: member.roles.concat(guildConfig),
    })

    log.debug(LogTag, `Assigned roles to member ${member.tag} (${member.id}) in guild ${member.guildID}`)
})
