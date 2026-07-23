import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'
import { neonConfig } from '@neondatabase/serverless'

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local'
dotenv.config({ path: envFile })

//* Same guard as src/db/index.ts — drizzle-kit runs as its own process with
//* its own connection, so it needs this patch applied independently here.
if (new URL(process.env.DATABASE_URL!).hostname === 'db.localtest.me') {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
