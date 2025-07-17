import assert from 'assert'
import { type Member, Permissions, type Role } from 'oceanic.js'
import { bot, log } from '~/context'

export async function getGuild(guildId: string) {
    try {
        const guild = bot.guilds.get(guildId) ?? (await bot.rest.guilds.get(guildId))
        return guild
    } catch (e) {
        log.trace('getGuild', 'Failed to get guild:', guildId, e)
        return null
    }
}

export async function getMember(guildId: string, userId: string) {
    try {
        const guild = await getGuild(guildId)
        if (!guild) return null

        const member = guild.members.get(userId) ?? (await bot.rest.guilds.getMember(guildId, userId))
        return member
    } catch (e) {
        log.trace('getMember', 'Failed to get member:', guildId, userId, e)
        return null
    }
}

export function getSelfMember(guildId: string) {
    return getMember(guildId, bot.user.id)!
}

export async function isMemberManageable(member: Member) {
    const self = await getSelfMember(member.guildID)
    assert(self, 'Self member not available')

    if (!member.roles.length) return self.roles.length
    if (!self.roles.length) return member.roles.length

    const guild = await getGuild(member.guildID)
    assert(guild, 'Guild not available')

    const highestRolePositionReducer = (prev: Role, id: string): Role => {
        const current = guild.roles.get(id)!
        return current.position > prev.position ? current : prev
    }

    const [firstMemberRoleId] = member.roles
    const [firstSelfRoleId] = self.roles

    const memberHighest = member.roles.reduce(highestRolePositionReducer, guild.roles.get(firstMemberRoleId!)!)
    const selfHighest = self.roles.reduce(highestRolePositionReducer, guild.roles.get(firstSelfRoleId!)!)

    return (
        self.permissions.allow & (Permissions.BAN_MEMBERS | Permissions.ADMINISTRATOR) &&
        selfHighest.position >= memberHighest.position
    )
}
