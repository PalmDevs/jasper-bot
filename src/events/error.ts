import { bot, log } from '~/context'

const EventName = 'error'
const LogTag = `events/${EventName}`

bot.on(EventName, err => {
    log.error(LogTag, 'Something definitely blew up:\n', err)
})
