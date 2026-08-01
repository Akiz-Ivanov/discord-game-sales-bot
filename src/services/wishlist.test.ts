import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addGameToWishlist,
  removeGameFromWishlist,
  getWishlist,
} from './wishlist'
import { upsertUser, getUserByDiscordId } from '@/repositories/users'
import { upsertGame } from '@/repositories/games'
import { getGamePrices } from '@/services/prices'
import {
  addWishlistItem,
  removeWishlistItem,
  listWishlistItems,
  countWishlistItems,
} from '@/repositories/wishlist'
import { game, makeDeal, makeGameRow } from '@/test/factories'
import { PriceSnapshot } from '@/types'

vi.mock('@/repositories/users', () => ({
  upsertUser: vi.fn(),
  getUserByDiscordId: vi.fn(),
}))
vi.mock('@/repositories/games', () => ({
  upsertGame: vi.fn(),
}))
vi.mock('@/repositories/wishlist', () => ({
  addWishlistItem: vi.fn(),
  removeWishlistItem: vi.fn(),
  listWishlistItems: vi.fn(),
  countWishlistItems: vi.fn(),
}))
vi.mock('@/services/prices', () => ({
  getGamePrices: vi.fn(),
}))

const discordId = '123456789012345678'
const guildId = '999888777666555444'
const userRow = { id: 1, discordId, guildId, createdAt: new Date() }
const gameRow = makeGameRow({ id: 2 })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(countWishlistItems).mockResolvedValue(0)
})

describe('addGameToWishlist', () => {
  it('upserts user and game, fetches prices, and returns "added" with the snapshot on a fresh insert', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
    const snapshot: PriceSnapshot = {
      deals: [makeDeal({ cut: 0 })],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    }
    vi.mocked(getGamePrices).mockResolvedValue(snapshot)
    vi.mocked(addWishlistItem).mockResolvedValue({
      id: 1,
      userId: userRow.id,
      gameId: gameRow.id,
      lastNotifiedPrice: null,
      createdAt: new Date(),
    })

    const result = await addGameToWishlist(discordId, guildId, game)

    expect(upsertUser).toHaveBeenCalledWith(discordId, guildId)
    expect(upsertGame).toHaveBeenCalledWith(game)
    expect(getGamePrices).toHaveBeenCalledWith(gameRow.id, game.id)
    expect(addWishlistItem).toHaveBeenCalledWith(
      userRow.id,
      gameRow.id,
      undefined
    )
    expect(result).toEqual({ status: 'added', priceSnapshot: snapshot })
  })

  it('seeds lastNotifiedPrice with the cheapest deal when it is on sale', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
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
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [expensive, cheap],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
    vi.mocked(addWishlistItem).mockResolvedValue({
      id: 1,
      userId: userRow.id,
      gameId: gameRow.id,
      lastNotifiedPrice: 699,
      createdAt: new Date(),
    })

    await addGameToWishlist(discordId, guildId, game)

    expect(addWishlistItem).toHaveBeenCalledWith(userRow.id, gameRow.id, 699)
  })

  it('does not seed lastNotifiedPrice when the cheapest deal has no discount', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [makeDeal({ cut: 0 })],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
    vi.mocked(addWishlistItem).mockResolvedValue({
      id: 1,
      userId: userRow.id,
      gameId: gameRow.id,
      lastNotifiedPrice: null,
      createdAt: new Date(),
    })

    await addGameToWishlist(discordId, guildId, game)

    expect(addWishlistItem).toHaveBeenCalledWith(
      userRow.id,
      gameRow.id,
      undefined
    )
  })

  it('does not seed lastNotifiedPrice when there are no deals at all', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
    vi.mocked(addWishlistItem).mockResolvedValue({
      id: 1,
      userId: userRow.id,
      gameId: gameRow.id,
      lastNotifiedPrice: null,
      createdAt: new Date(),
    })

    await addGameToWishlist(discordId, guildId, game)

    expect(addWishlistItem).toHaveBeenCalledWith(
      userRow.id,
      gameRow.id,
      undefined
    )
  })

  it('returns "already_exists" with the snapshot when addWishlistItem returns null', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
    const snapshot: PriceSnapshot = {
      deals: [makeDeal({ cut: 0 })],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    }
    vi.mocked(getGamePrices).mockResolvedValue(snapshot)
    vi.mocked(addWishlistItem).mockResolvedValue(null)

    const result = await addGameToWishlist(discordId, guildId, game)

    expect(result).toEqual({
      status: 'already_exists',
      priceSnapshot: snapshot,
    })
  })

  it('returns "limit_reached" without fetching prices or inserting when the user is at the cap', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
    vi.mocked(countWishlistItems).mockResolvedValue(100)

    const result = await addGameToWishlist(discordId, guildId, game)

    expect(result).toEqual({ status: 'limit_reached' })
    expect(getGamePrices).not.toHaveBeenCalled()
    expect(addWishlistItem).not.toHaveBeenCalled()
  })

  it('proceeds normally when the user is under the cap', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
    vi.mocked(countWishlistItems).mockResolvedValue(5)
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
    vi.mocked(addWishlistItem).mockResolvedValue({
      id: 1,
      userId: userRow.id,
      gameId: gameRow.id,
      lastNotifiedPrice: null,
      createdAt: new Date(),
    })

    const result = await addGameToWishlist(discordId, guildId, game)

    expect(result.status).toBe('added')
  })
})

describe('removeGameFromWishlist', () => {
  it('removes and returns "removed" when the row exists', async () => {
    vi.mocked(removeWishlistItem).mockResolvedValue(true)

    const result = await removeGameFromWishlist(userRow.id, gameRow.id)

    expect(removeWishlistItem).toHaveBeenCalledWith(userRow.id, gameRow.id)
    expect(result).toEqual({ status: 'removed' })
  })

  it('returns "not_found" when the row is already gone (e.g. a stale selection)', async () => {
    vi.mocked(removeWishlistItem).mockResolvedValue(false)

    const result = await removeGameFromWishlist(userRow.id, gameRow.id)

    expect(result).toEqual({ status: 'not_found' })
  })
})

describe('getWishlist', () => {
  it('returns [] without calling listWishlistItems when the user has never interacted', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(null)

    const result = await getWishlist(discordId)

    expect(listWishlistItems).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })

  it("returns the user's wishlist items when the user exists", async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(listWishlistItems).mockResolvedValue([
      {
        id: 1,
        userId: userRow.id,
        gameId: gameRow.id,
        lastNotifiedPrice: null,
        createdAt: new Date(),
        game: gameRow,
      },
    ])

    const result = await getWishlist(discordId)

    expect(listWishlistItems).toHaveBeenCalledWith(userRow.id)
    expect(result).toHaveLength(1)
    expect(result[0].game).toEqual(gameRow)
  })
})
