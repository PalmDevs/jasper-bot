// @ts-check

/** @type {import('./src/context').Config} */
export default {
    admin: {
        users: [],
    },
    mod: {
        mute: {
            reapplyTimeoutInterval: 86400,
        },
        guilds: {},
    },
    notes: {},
    prefix: {
        matches: ['J', 'j!'],
        mentions: true,
    },
}
