import { bot, config } from '~/context'
import { decancerMember, isMemberManageable } from '~/utils/guilds'

bot.on('guildMemberAdd', async member => {
    if (config.mod?.guilds[member.guildID]?.decancer && (await isMemberManageable(member))) await decancerMember(member)
})
