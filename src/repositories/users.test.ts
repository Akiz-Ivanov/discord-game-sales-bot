import { describe, it, expect } from 'vitest'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getUserByDiscordId, upsertUser } from './users'
import { resetDb } from '@/test/db-reset'
import { beforeEach } from 'vitest'

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
