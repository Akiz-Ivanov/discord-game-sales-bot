import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { getSaleAlerts } from '@/services/saleAlerts'
import { postChannelMessage } from '@/discord/rest'
import { updateLastNotifiedPrices } from '@/repositories/wishlist'

vi.mock('@/services/saleAlerts', () => ({ getSaleAlerts: vi.fn() }))
vi.mock('@/discord/rest', () => ({ postChannelMessage: vi.fn() }))
vi.mock('@/discord/views/saleAlert', () => ({
  buildSaleAlertMessage: vi.fn(() => ({ flags: 0, components: [] })),
}))
vi.mock('@/repositories/wishlist', () => ({
  updateLastNotifiedPrices: vi.fn(),
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

  it('marks every recipient as notified at the alerted price after a successful post', async () => {
    vi.mocked(getSaleAlerts).mockResolvedValue([
      {
        guildId: 'g1',
        notificationChannelId: 'c1',
        alerts: [
          {
            gameId: 1,
            itadId: 'itad-1',
            title: 'Hollow Knight',
            deal: { price: { amountInt: 999 } } as never,
            recipients: [
              { wishlistItemId: 10, discordId: 'user-1' },
              { wishlistItemId: 11, discordId: 'user-2' },
            ],
          },
        ],
      },
    ])
    vi.mocked(postChannelMessage).mockResolvedValue(
      {} as Awaited<ReturnType<typeof postChannelMessage>>
    )

    await GET(buildRequest('Bearer test-secret'))

    expect(updateLastNotifiedPrices).toHaveBeenCalledWith([
      { wishlistItemId: 10, price: 999 },
      { wishlistItemId: 11, price: 999 },
    ])
  })

  it('does not mark recipients as notified when the post fails', async () => {
    vi.mocked(getSaleAlerts).mockResolvedValue([
      {
        guildId: 'g1',
        notificationChannelId: 'c1',
        alerts: [
          {
            gameId: 1,
            itadId: 'itad-1',
            title: 'Hollow Knight',
            deal: { price: { amountInt: 999 } } as never,
            recipients: [{ wishlistItemId: 10, discordId: 'user-1' }],
          },
        ],
      },
    ])
    vi.mocked(postChannelMessage).mockRejectedValue(new Error('boom'))

    await GET(buildRequest('Bearer test-secret'))

    expect(updateLastNotifiedPrices).not.toHaveBeenCalled()
  })
})
