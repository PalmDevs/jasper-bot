import { Command, type CommandTriggers, type CreateCommandOptions } from './Command'
import type { InteractionContextTypes } from 'oceanic.js'

export class UserContextMenuCommand<
    const Triggers extends BitFlagDictValue<typeof CommandTriggers>,
    const Contexts extends InteractionContextTypes[],
> extends Command<Triggers, Contexts> {
    constructor(options: CreateUserContextMenuCommand<Triggers, Contexts>) {
        super(options)

        // TODO
    }

    // TODO
    async execute(...args: unknown[]): Promise<unknown> {
        // Implementation for executing the command
        return Promise.resolve()
    }

    // TODO
    static createExecuteActions() {}
}

export interface CreateUserContextMenuCommand<
    Triggers extends BitFlagDictValue<typeof CommandTriggers>,
    Contexts extends InteractionContextTypes[],
> extends CreateCommandOptions<Triggers, Contexts> {}
