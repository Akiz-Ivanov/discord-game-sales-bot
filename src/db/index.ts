import { drizzle } from 'drizzle-orm/neon-http'
import { neonConfig } from '@neondatabase/serverless'
import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL!

//* Only relevant when pointed at the local Docker Postgres + Neon proxy
//* (see docker-compose.yml) — real Neon URLs never hit this branch.
if (new URL(databaseUrl).hostname === 'db.localtest.me') {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`
}

export const db = drizzle(process.env.DATABASE_URL!, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})
