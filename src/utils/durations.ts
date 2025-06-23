import { Duration, DurationFormatter } from '@sapphire/duration'

const AllDigits = /^\d+$/

export function parseDuration(str: string, defaultUnit = 'm') {
    if (AllDigits.test(str)) str += defaultUnit
    return new Duration(str)
}

// TODO(utils/durations): configure units?
const fmt = new DurationFormatter()

export function formatDuration(ms: number) {
    return fmt.format(ms)
}
