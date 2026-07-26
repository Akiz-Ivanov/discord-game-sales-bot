import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import { wishlistItems } from '@/db/schema'
import {
  addWishlistItem,
  removeWishlistItem,
  listWishlistItems,
} from './wishlist'
import { upsertUser } from './users'
import { upsertGame } from './games'
import { resetDb } from '@/test/db-reset'
import { game } from '@/test/factories'

const discordId = '123456789012345678'

const setup = async () => {
  const user = await upsertUser(discordId)
  const gameRow = await upsertGame(game)
  return { userId: user.id, gameId: gameRow.id }
}

describe('addWishlistItem', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('inserts a wishlist row on first call', async () => {
    const { userId, gameId } = await setup()

    const row = await addWishlistItem(userId, gameId)

    expect(row).not.toBeNull()
    expect(row!.userId).toBe(userId)
    expect(row!.gameId).toBe(gameId)
  })

  it('returns null on a duplicate add, without creating a second row', async () => {
    const { userId, gameId } = await setup()
    await addWishlistItem(userId, gameId)

    const second = await addWishlistItem(userId, gameId)

    expect(second).toBeNull()
    const all = await db.select().from(wishlistItems)
    expect(all).toHaveLength(1)
  })

  it('allows the same game to be added by two different users', async () => {
    const { userId, gameId } = await setup()
    const otherUser = await upsertUser('987654321098765432')

    const rowA = await addWishlistItem(userId, gameId)
    const rowB = await addWishlistItem(otherUser.id, gameId)

    expect(rowA).not.toBeNull()
    expect(rowB).not.toBeNull()
  })
})

describe('removeWishlistItem', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('deletes an existing wishlist row and returns true', async () => {
    const { userId, gameId } = await setup()
    await addWishlistItem(userId, gameId)

    const result = await removeWishlistItem(userId, gameId)

    expect(result).toBe(true)
    const all = await db.select().from(wishlistItems)
    expect(all).toHaveLength(0)
  })

  it('returns false when the pair was never on the wishlist', async () => {
    const { userId, gameId } = await setup()

    const result = await removeWishlistItem(userId, gameId)

    expect(result).toBe(false)
  })

  it("does not remove a different user's wishlist item for the same game", async () => {
    const { userId, gameId } = await setup()
    const otherUser = await upsertUser('987654321098765432')
    await addWishlistItem(userId, gameId)
    await addWishlistItem(otherUser.id, gameId)

    await removeWishlistItem(userId, gameId)

    const remaining = await db.select().from(wishlistItems)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].userId).toBe(otherUser.id)
  })
})

describe('listWishlistItems', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('returns an empty array for a user with no wishlist items', async () => {
    const { userId } = await setup()

    const result = await listWishlistItems(userId)

    expect(result).toEqual([])
  })

  it('returns the joined game row for each wishlist item', async () => {
    const { userId, gameId } = await setup()
    await addWishlistItem(userId, gameId)

    const result = await listWishlistItems(userId)

    expect(result).toHaveLength(1)
    expect(result[0].game.id).toBe(gameId)
    expect(result[0].game.title).toBe(game.title)
  })

  it("does not include another user's wishlist items", async () => {
    const { userId, gameId } = await setup()
    const otherUser = await upsertUser('987654321098765432')
    await addWishlistItem(otherUser.id, gameId)

    const result = await listWishlistItems(userId)

    expect(result).toEqual([])
  })

  it("returns all games on a user's wishlist when there are several", async () => {
    const { userId, gameId } = await setup()
    const secondGame = await upsertGame({
      ...game,
      id: 'b1b2c3d4-0000-0000-0000-000000000000',
      slug: 'second-game',
      title: 'Second Game',
    })
    await addWishlistItem(userId, gameId)
    await addWishlistItem(userId, secondGame.id)

    const result = await listWishlistItems(userId)

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.game.title).sort()).toEqual([
      'Hollow Knight',
      'Second Game',
    ])
  })
})

describe('addWishlistItem — referential integrity', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('rejects when userId does not reference an existing users row', async () => {
    const { gameId } = await setup()

    await expect(addWishlistItem(999999, gameId)).rejects.toThrow()
  })

  it('rejects when gameId does not reference an existing games row', async () => {
    const { userId } = await setup()

    await expect(addWishlistItem(userId, 999999)).rejects.toThrow()
  })
})
