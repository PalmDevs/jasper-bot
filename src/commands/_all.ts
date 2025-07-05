import { commands, log } from '~/context'
// Import all commands
import EvalCommand from './admin/eval'
import RegisterCommand from './admin/register'
import StopCommand from './admin/stop'
import ThrowCommand from './admin/throw'
import HelloCommand from './fun/hello'
import IsCommand from './fun/is'
import AboutCommand from './misc/about'
import ReplyCommand from './misc/reply'
import BanCommand from './mod/ban'
import MuteCommand from './mod/mute'
import PurgeCommand from './mod/purge'
import RoleCommand from './mod/role'
import SlowmodeCommand from './mod/slowmode'
import AvatarCommand from './utils/avatar'
import NoteCommand from './utils/note'

const LogTag = 'commands'

export const cmds = [
    EvalCommand,
    StopCommand,
    RegisterCommand,
    ThrowCommand,
    HelloCommand,
    IsCommand,
    ReplyCommand,
    AboutCommand,
    BanCommand,
    MuteCommand,
    PurgeCommand,
    RoleCommand,
    SlowmodeCommand,
    AvatarCommand,
    NoteCommand,
]

for (const cmd of cmds) {
    if (commands.has(cmd.name))
        log.warn(LogTag, `Aliases ${cmd.name} for ${commands.get(cmd.name)!.name} collides with existing command.`)

    commands.set(cmd.name, cmd)
    if (cmd.aliases)
        for (const alias of cmd.aliases) {
            if (commands.has(alias)) {
                log.warn(LogTag, `Alias ${alias} for ${cmd.name} collides with existing command.`)
                continue
            }

            commands.set(alias, cmd)
        }
}
