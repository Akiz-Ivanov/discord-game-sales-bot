import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSaleAlerts } from './cron'
import { getWishlistedGamesByGuild } from '@/repositories/wishlist'
import { getPrices } from '@/itad/client'
import { game, makeDeal } from '@/test/factories'

vi.mock('@/repositories/wishlist', () => ({
  getWishlistedGamesByGuild: vi.fn(),
}))
vi.mock('@/itad/client', () => ({ getPrices: vi.fn() }))

const makeRow = (overrides = {}) => ({
  guildId: 'guild-1',
  notificationChannelId: 'channel-1',
  wishlistItemId: 1,
  discordId: 'user-1',
  gameId: 10,
  itadId: game.id,
  title: game.title,
  lastNotifiedPrice: null,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSaleAlerts', () => {
  it('returns [] without calling getPrices when there are no wishlisted rows', async () => {
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([])

    const result = await getSaleAlerts()

    expect(result).toEqual([])
    expect(getPrices).not.toHaveBeenCalled()
  })

  it('dedupes itadIds before calling getPrices', async () => {
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([
      makeRow({ discordId: 'user-1' }),
      makeRow({ discordId: 'user-2' }), // same game, different user
    ])
    vi.mocked(getPrices).mockResolvedValue([])

    await getSaleAlerts()

    expect(getPrices).toHaveBeenCalledWith([game.id])
  })

  it('skips a row when ITAD returns no price data for its itadId', async () => {
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([makeRow()])
    vi.mocked(getPrices).mockResolvedValue([])

    const result = await getSaleAlerts()

    expect(result).toEqual([])
  })

  it('skips a row when there is no discount', async () => {
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([makeRow()])
    vi.mocked(getPrices).mockResolvedValue([
      { id: game.id, historyLow: {}, deals: [makeDeal({ cut: 0 })] },
    ])

    const result = await getSaleAlerts()

    expect(result).toEqual([])
  })

  it('skips a row when the price matches lastNotifiedPrice', async () => {
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([
      makeRow({ lastNotifiedPrice: 999 }),
    ])
    vi.mocked(getPrices).mockResolvedValue([
      {
        id: game.id,
        historyLow: {},
        deals: [
          makeDeal({
            cut: 25,
            price: { amount: 9.99, amountInt: 999, currency: 'USD' },
          }),
        ],
      },
    ])

    const result = await getSaleAlerts()

    expect(result).toEqual([])
  })

  it('includes a row that warrants notification, grouped under its guild', async () => {
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([makeRow()])
    const deal = makeDeal({ cut: 25 })
    vi.mocked(getPrices).mockResolvedValue([
      { id: game.id, historyLow: {}, deals: [deal] },
    ])

    const result = await getSaleAlerts()

    expect(result).toEqual([
      {
        guildId: 'guild-1',
        notificationChannelId: 'channel-1',
        alerts: [
          {
            wishlistItemId: 1,
            discordId: 'user-1',
            gameId: 10,
            itadId: game.id,
            title: game.title,
            deal,
          },
        ],
      },
    ])
  })

  it('groups multiple alerts for the same guild together', async () => {
    const otherGame = { ...game, id: 'other-itad-id' }
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([
      makeRow(),
      makeRow({
        wishlistItemId: 2,
        gameId: 20,
        itadId: otherGame.id,
        title: 'Other Game',
      }),
    ])
    vi.mocked(getPrices).mockResolvedValue([
      { id: game.id, historyLow: {}, deals: [makeDeal({ cut: 25 })] },
      { id: otherGame.id, historyLow: {}, deals: [makeDeal({ cut: 50 })] },
    ])

    const result = await getSaleAlerts()

    expect(result).toHaveLength(1)
    expect(result[0].alerts).toHaveLength(2)
  })

  it('separates alerts into different guilds', async () => {
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([
      makeRow({ guildId: 'guild-1', notificationChannelId: 'channel-1' }),
      makeRow({
        guildId: 'guild-2',
        notificationChannelId: 'channel-2',
        discordId: 'user-2',
      }),
    ])
    vi.mocked(getPrices).mockResolvedValue([
      { id: game.id, historyLow: {}, deals: [makeDeal({ cut: 25 })] },
    ])

    const result = await getSaleAlerts()

    expect(result).toHaveLength(2)
    expect(result.map((g) => g.guildId).sort()).toEqual(['guild-1', 'guild-2'])
  })

  it('picks the cheapest deal when a game has multiple store listings', async () => {
    vi.mocked(getWishlistedGamesByGuild).mockResolvedValue([makeRow()])
    const cheap = makeDeal({
      shop: { id: 1, name: 'GOG' },
      cut: 30,
      price: { amount: 6.99, amountInt: 699, currency: 'USD' },
    })
    const expensive = makeDeal({
      shop: { id: 2, name: 'Steam' },
      cut: 10,
      price: { amount: 8.99, amountInt: 899, currency: 'USD' },
    })
    vi.mocked(getPrices).mockResolvedValue([
      { id: game.id, historyLow: {}, deals: [expensive, cheap] },
    ])

    const result = await getSaleAlerts()

    expect(result[0].alerts[0].deal.shop.name).toBe('GOG')
  })
})
