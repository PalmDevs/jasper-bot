import { bot, config } from '~/context'
import { decancerMember, isMemberManageable } from '~/utils/guilds'

bot.on('messageCreate', async msg => {
    const { member } = msg
    if (!member) return

    if (config.mod?.guilds[member.guildID]?.decancer && (await isMemberManageable(member))) await decancerMember(member)
})
