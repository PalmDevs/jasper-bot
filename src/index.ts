import { bot, config, log } from './context'

log.debug('index', 'Loaded config', config)

import './events/_all'
import './commands/_all'

log.debug('index', 'Loaded events and commands')

bot.connect()

process.on('exit', async () => {
    await bot.editStatus('invisible')
    bot.disconnect()
})
