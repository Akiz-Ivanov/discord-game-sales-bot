import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { getSaleAlerts } from '@/services/cron'
import { postChannelMessage } from '@/discord/rest'

vi.mock('@/services/cron', () => ({ getSaleAlerts: vi.fn() }))
vi.mock('@/discord/rest', () => ({ postChannelMessage: vi.fn() }))
vi.mock('@/discord/embeds/saleAlert', () => ({
  buildSaleAlertMessage: vi.fn(() => ({ content: 'stub' })),
}))

const buildRequest = (authHeader: string | null) =>
  new Request('http://localhost/api/cron/price-check', {
    headers: authHeader ? { authorization: authHeader } : {},
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/cron/price-check', () => {
  it('returns 401 when the authorization header is missing', async () => {
    const res = await GET(buildRequest(null))
    expect(res.status).toBe(401)
    expect(getSaleAlerts).not.toHaveBeenCalled()
  })

  it('returns 401 when the authorization header does not match CRON_SECRET', async () => {
    const res = await GET(buildRequest('Bearer wrong-value'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET itself is unset', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await GET(buildRequest('Bearer test-secret'))
    expect(res.status).toBe(401)
  })

  it('posts one message per guild when the header matches', async () => {
    vi.mocked(getSaleAlerts).mockResolvedValue([
      { guildId: 'g1', notificationChannelId: 'c1', alerts: [] },
      { guildId: 'g2', notificationChannelId: 'c2', alerts: [] },
    ])
    vi.mocked(postChannelMessage).mockResolvedValue(
      {} as Awaited<ReturnType<typeof postChannelMessage>>
    )

    const res = await GET(buildRequest('Bearer test-secret'))
    const body = await res.json()

    expect(postChannelMessage).toHaveBeenCalledTimes(2)
    expect(body).toEqual({ guildsNotified: 2, guildsFailed: 0 })
  })

  it('counts a failed post without blocking the others', async () => {
    vi.mocked(getSaleAlerts).mockResolvedValue([
      { guildId: 'g1', notificationChannelId: 'c1', alerts: [] },
      { guildId: 'g2', notificationChannelId: 'c2', alerts: [] },
    ])
    vi.mocked(postChannelMessage)
      .mockRejectedValueOnce(new Error('channel deleted'))
      .mockResolvedValueOnce(
        {} as Awaited<ReturnType<typeof postChannelMessage>>
      )

    const res = await GET(buildRequest('Bearer test-secret'))
    const body = await res.json()

    expect(body).toEqual({ guildsNotified: 1, guildsFailed: 1 })
  })
})
