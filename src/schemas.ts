import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const mutes = sqliteTable(
    'mutes',
    {
        userId: text('id').notNull(),
        guildId: text('guild_id').notNull(),
        reason: text('reason').notNull(),
        modId: text('modId').notNull(),
        // Field only set when the duration is >28 days (Discord limitation)
        timeoutExpires: integer('timeout_expires'),
        expires: integer('expires'),
    },
    table => [primaryKey({ columns: [table.guildId, table.userId] })],
)
