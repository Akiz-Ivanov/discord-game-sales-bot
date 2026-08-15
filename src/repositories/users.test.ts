import { describe, it, expect } from 'vitest'
import { db } from '@/db'
import { users, wishlistItems } from '@/db/schema'
import { deleteUserByDiscordId, getUserByDiscordId, upsertUser } from './users'
import { resetDb } from '@/test/db-reset'
import { beforeEach } from 'vitest'
import { upsertGame } from './games'
import { game } from '@/test/factories'
import { addWishlistItem } from './wishlist'
import { eq } from 'drizzle-orm'

const discordId = '123456789012345678' //* snowflake, stored as text
const guildId = '999888777666555444'

describe('upsertUser', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('inserts a new user on first call', async () => {
    const row = await upsertUser(discordId, guildId)

    expect(row.discordId).toBe(discordId)
    expect(row.guildId).toBe(guildId)
    expect(row.id).toBeTypeOf('number')
  })

  it('returns the same row on a repeat call, without creating a duplicate', async () => {
    const first = await upsertUser(discordId, guildId)
    const second = await upsertUser(discordId, guildId)

    expect(second.id).toBe(first.id)

    const all = await db.select().from(users)
    expect(all).toHaveLength(1)
  })

  it('does not cross-contaminate rows for different discordIds', async () => {
    const rowA = await upsertUser(discordId, guildId)
    const rowB = await upsertUser('987654321098765432', guildId)

    expect(rowA.id).not.toBe(rowB.id)

    const all = await db.select().from(users)
    expect(all).toHaveLength(2)
  })
})

describe('getUserByDiscordId', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('returns null when no user exists for that discordId', async () => {
    expect(await getUserByDiscordId(discordId)).toBeNull()
  })

  it('returns the existing row when one exists', async () => {
    const created = await upsertUser(discordId, guildId)

    const result = await getUserByDiscordId(discordId)

    expect(result?.id).toBe(created.id)
  })
})

describe('deleteUserByDiscordId', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('deletes an existing user row and returns true', async () => {
    await upsertUser(discordId, guildId)

    expect(await deleteUserByDiscordId(discordId)).toBe(true)
    expect(await getUserByDiscordId(discordId)).toBeNull()
  })

  it('returns false when no user row exists for that discordId', async () => {
    expect(await deleteUserByDiscordId(discordId)).toBe(false)
  })

  it("cascades to delete the user's wishlist_items too", async () => {
    const user = await upsertUser(discordId, guildId)
    const gameRow = await upsertGame(game)
    await addWishlistItem(user.id, gameRow.id)

    await deleteUserByDiscordId(discordId)

    const remaining = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, user.id))
    expect(remaining).toHaveLength(0)
  })
})
