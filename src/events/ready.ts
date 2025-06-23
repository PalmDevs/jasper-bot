import { ActivityTypes } from 'oceanic.js'
import { bot, log } from '../context'
import { s, string } from '../strings'

const EventName = 'ready'
const LogTag = `events/${EventName}`

bot.on(EventName, () => {
    const { user, guilds } = bot

    setRandomActivity()
    setInterval(setRandomActivity, 10 * 60 * 1e3)

    log.info(LogTag, `Online as ${user.tag} (${user.id}) in ${guilds.size} servers, sigh.`)
})

const RandomActivityTypes = [ActivityTypes.LISTENING, ActivityTypes.WATCHING] as const

function setRandomActivity() {
    const type = RandomActivityTypes[Math.floor(Math.random() * RandomActivityTypes.length)]!

    let name: string

    switch (type) {
        case ActivityTypes.LISTENING:
            name = string(s.status.listening)
            break
        case ActivityTypes.WATCHING:
            name = string(s.status.watching)
            break
    }

    bot.editStatus('dnd', [
        {
            name,
            type,
        },
    ])
}
