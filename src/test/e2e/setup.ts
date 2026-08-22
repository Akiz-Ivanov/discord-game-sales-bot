import { beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse, passthrough } from 'msw'
import { TEST_PUBLIC_KEY } from '@/test/e2e/signInteraction'
import { resetDb } from '@/test/db-reset'
import searchFixture from '@/test/e2e/fixtures/itad/search-hollow-knight.json'
import pricesFixture from '@/test/e2e/fixtures/itad/prices-hollow-knight.json'

//* Runs after setup-env.ts's dotenv load — overrides just this one var
//* so real verifyKey() calls trust signatures made by our test keypair
//* instead of whatever's in .env.test.
process.env.DISCORD_PUBLIC_KEY = TEST_PUBLIC_KEY
process.env.ITAD_API_KEY = 'test-itad-key'
process.env.CRON_SECRET = 'test-cron-secret'
process.env.DISCORD_BOT_TOKEN = 'test-bot-token'

//* one handler per ITAD endpoint covered commands hit
export const server = setupServer(
  //* Local Postgres proxy (Docker + neon-proxy) — real traffic, not
  //* something to mock. Without this, MSW intercepts and blocks every
  //* DB call the moment the server starts listening.
  http.post('http://db.localtest.me:4545/sql', () => passthrough()),

  http.get('https://api.isthereanydeal.com/games/search/v1', () =>
    HttpResponse.json(searchFixture)
  ),
  http.post('https://api.isthereanydeal.com/games/prices/v3', () =>
    HttpResponse.json(pricesFixture)
  ),
  http.post('https://discord.com/api/v10/channels/:channelId/messages', () =>
    HttpResponse.json({ id: 'fake-message-id' })
  )
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

//* Same one-shared-Postgres-instance reasoning as the `repositories`
//* project — reset before each test so one e2e test's writes can't
//* leak into the next.
beforeEach(() => resetDb())
