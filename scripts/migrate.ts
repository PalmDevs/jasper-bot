import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'

const sqlite = new Database('sqlite.db')
export const db = drizzle({ client: sqlite })

migrate(db, { migrationsFolder: './drizzle' })
