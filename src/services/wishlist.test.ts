import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addGameToWishlist,
  removeGameFromWishlist,
  getWishlist,
} from './wishlist'
import { upsertUser, getUserByDiscordId } from '@/repositories/users'
import { upsertGame } from '@/repositories/games'
import {
  addWishlistItem,
  removeWishlistItem,
  listWishlistItems,
} from '@/repositories/wishlist'
import { game, makeGameRow } from '@/test/factories'

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
}))

const discordId = '123456789012345678'
const userRow = { id: 1, discordId, createdAt: new Date() }
const gameRow = makeGameRow({ id: 2 })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('addGameToWishlist', () => {
  it('upserts user and game, then returns "added" on a fresh insert', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
    vi.mocked(addWishlistItem).mockResolvedValue({
      id: 1,
      userId: userRow.id,
      gameId: gameRow.id,
      lastNotifiedPrice: null,
      createdAt: new Date(),
    })

    const result = await addGameToWishlist(discordId, game)

    expect(upsertUser).toHaveBeenCalledWith(discordId)
    expect(upsertGame).toHaveBeenCalledWith(game)
    expect(addWishlistItem).toHaveBeenCalledWith(userRow.id, gameRow.id)
    expect(result).toEqual({ status: 'added' })
  })

  it('returns "already_exists" when addWishlistItem returns null', async () => {
    vi.mocked(upsertUser).mockResolvedValue(userRow)
    vi.mocked(upsertGame).mockResolvedValue(gameRow)
    vi.mocked(addWishlistItem).mockResolvedValue(null)

    const result = await addGameToWishlist(discordId, game)

    expect(result).toEqual({ status: 'already_exists' })
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
    vi.mocked(listWishlistItems).mockResolvedValue([{ game: gameRow }])

    const result = await getWishlist(discordId)

    expect(listWishlistItems).toHaveBeenCalledWith(userRow.id)
    expect(result).toEqual([{ game: gameRow }])
  })
})
