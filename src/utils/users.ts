import { bot, log } from '~/context'

export async function getUser(userId: string) {
    try {
        return bot.users.get(userId) ?? (await bot.rest.users.get(userId))
    } catch (e) {
        log.trace('getUser', 'Failed to get user:', userId, e)
        return null
    }
}
