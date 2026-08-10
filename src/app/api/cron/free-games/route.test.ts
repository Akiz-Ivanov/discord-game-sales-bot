// src/app/api/cron/free-games/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { getSortedFreeGames } from '@/services/freeGames'
import { getGuildsWithNotificationChannel } from '@/repositories/guilds'
import { postChannelMessage } from '@/discord/rest'

vi.mock('@/services/freeGames', () => ({ getSortedFreeGames: vi.fn() }))
vi.mock('@/repositories/guilds', () => ({
  getGuildsWithNotificationChannel: vi.fn(),
}))
vi.mock('@/discord/rest', () => ({ postChannelMessage: vi.fn() }))
vi.mock('@/discord/views/freeGames', () => ({
  buildFreeGamesMessage: vi.fn(() => ({ flags: 0, components: [] })),
}))

const buildRequest = (authHeader: string | null) =>
  new Request('http://localhost/api/cron/free-games', {
    headers: authHeader ? { authorization: authHeader } : {},
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/cron/free-games', () => {
  it('returns 401 when the authorization header is missing', async () => {
    const res = await GET(buildRequest(null))
    expect(res.status).toBe(401)
    expect(getSortedFreeGames).not.toHaveBeenCalled()
  })

  it('returns 401 when the authorization header does not match CRON_SECRET', async () => {
    const res = await GET(buildRequest('Bearer wrong-value'))
    expect(res.status).toBe(401)
  })

  it('skips guild lookup and posting when there are no active giveaways', async () => {
    vi.mocked(getSortedFreeGames).mockResolvedValue([])

    const res = await GET(buildRequest('Bearer test-secret'))
    const body = await res.json()

    expect(getGuildsWithNotificationChannel).not.toHaveBeenCalled()
    expect(postChannelMessage).not.toHaveBeenCalled()
    expect(body).toEqual({
      guildsNotified: 0,
      guildsFailed: 0,
      activeGiveaways: 0,
    })
  })

  it('posts the same message to every configured guild', async () => {
    vi.mocked(getSortedFreeGames).mockResolvedValue([{ id: 1 } as never])
    vi.mocked(getGuildsWithNotificationChannel).mockResolvedValue([
      { guildId: 'g1', notificationChannelId: 'c1' },
      { guildId: 'g2', notificationChannelId: 'c2' },
    ])
    vi.mocked(postChannelMessage).mockResolvedValue(
      {} as Awaited<ReturnType<typeof postChannelMessage>>
    )

    const res = await GET(buildRequest('Bearer test-secret'))
    const body = await res.json()

    expect(postChannelMessage).toHaveBeenCalledTimes(2)
    expect(body).toEqual({
      guildsNotified: 2,
      guildsFailed: 0,
      activeGiveaways: 1,
    })
  })

  it('counts a failed post without blocking the others', async () => {
    vi.mocked(getSortedFreeGames).mockResolvedValue([{ id: 1 } as never])
    vi.mocked(getGuildsWithNotificationChannel).mockResolvedValue([
      { guildId: 'g1', notificationChannelId: 'c1' },
      { guildId: 'g2', notificationChannelId: 'c2' },
    ])
    vi.mocked(postChannelMessage)
      .mockRejectedValueOnce(new Error('channel deleted'))
      .mockResolvedValueOnce(
        {} as Awaited<ReturnType<typeof postChannelMessage>>
      )

    const res = await GET(buildRequest('Bearer test-secret'))
    const body = await res.json()

    expect(body).toEqual({
      guildsNotified: 1,
      guildsFailed: 1,
      activeGiveaways: 1,
    })
  })
})
