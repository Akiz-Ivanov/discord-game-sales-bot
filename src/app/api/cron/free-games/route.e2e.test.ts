import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { GET } from './route'
import { server } from '@/test/e2e/setup'
import { db } from '@/db'
import { guilds } from '@/db/schema'

const buildRequest = () =>
  new Request('http://localhost/api/cron/free-games', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })

describe('GET /api/cron/free-games (e2e)', () => {
  it('rejects a request without the correct bearer token', async () => {
    const res = await GET(new Request('http://localhost/api/cron/free-games'))
    expect(res.status).toBe(401)
  })

  it('posts to every guild with a configured alert channel', async () => {
    await db.insert(guilds).values([
      { guildId: 'guild-1', notificationChannelId: 'channel-1' },
      { guildId: 'guild-2', notificationChannelId: 'channel-2' },
      { guildId: 'guild-3', notificationChannelId: null }, //* not configured — must be excluded
    ])

    const res = await GET(buildRequest())
    const body = await res.json()

    expect(body).toEqual({
      guildsNotified: 2,
      guildsFailed: 0,
      activeGiveaways: 3,
    })
  })

  it('reports zero guilds and skips posting when there are no active giveaways', async () => {
    server.use(
      http.get('https://www.gamerpower.com/api/giveaways', () =>
        HttpResponse.json([])
      )
    )

    await db.insert(guilds).values({
      guildId: 'guild-1',
      notificationChannelId: 'channel-1',
    })

    const res = await GET(buildRequest())
    const body = await res.json()

    expect(body).toEqual({
      guildsNotified: 0,
      guildsFailed: 0,
      activeGiveaways: 0,
    })
  })
})
