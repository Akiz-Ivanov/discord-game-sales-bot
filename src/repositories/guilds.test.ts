import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import { guilds } from '@/db/schema'
import {
  getGuildsWithNotificationChannel,
  getGuildByGuildId,
  deleteGuildByGuildId,
  upsertGuildChannel,
} from './guilds'
import { resetDb } from '@/test/db-reset'

const guildId = '999888777666555444'
const channelId = '111222333444555666'

describe('upsertGuildChannel', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('inserts a new guild row on first call', async () => {
    const row = await upsertGuildChannel(guildId, channelId)

    expect(row.guildId).toBe(guildId)
    expect(row.notificationChannelId).toBe(channelId)
  })

  it('updates the channel in place on re-upsert, keeping the same id', async () => {
    const first = await upsertGuildChannel(guildId, channelId)
    const otherChannelId = '222333444555666777'

    const updated = await upsertGuildChannel(guildId, otherChannelId)

    expect(updated.id).toBe(first.id)
    expect(updated.notificationChannelId).toBe(otherChannelId)

    const rows = await db.select().from(guilds)
    expect(rows).toHaveLength(1)
  })

  it('does not cross-contaminate rows for different guildIds', async () => {
    const rowA = await upsertGuildChannel(guildId, channelId)
    const rowB = await upsertGuildChannel('other-guild-id', channelId)

    expect(rowA.id).not.toBe(rowB.id)

    const all = await db.select().from(guilds)
    expect(all).toHaveLength(2)
  })
})

describe('getGuildsWithNotificationChannel', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('returns [] when no guild has a configured channel', async () => {
    expect(await getGuildsWithNotificationChannel()).toEqual([])
  })

  it('returns only guilds with a configured channel', async () => {
    await upsertGuildChannel(guildId, channelId)
    await db.insert(guilds).values({ guildId: 'no-channel-guild' }) // no channel set

    const result = await getGuildsWithNotificationChannel()

    expect(result).toEqual([{ guildId, notificationChannelId: channelId }])
  })
})

describe('getGuildByGuildId', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('returns null when no guild row exists for that guildId', async () => {
    expect(await getGuildByGuildId(guildId)).toBeNull()
  })

  it('returns the existing row when one exists', async () => {
    const created = await upsertGuildChannel(guildId, channelId)

    const result = await getGuildByGuildId(guildId)

    expect(result?.id).toBe(created.id)
  })
})

describe('deleteGuildByGuildId', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('deletes an existing guild row and returns true', async () => {
    await upsertGuildChannel(guildId, channelId)

    expect(await deleteGuildByGuildId(guildId)).toBe(true)
    expect(await getGuildByGuildId(guildId)).toBeNull()
  })

  it('returns false when no guild row exists for that guildId', async () => {
    expect(await deleteGuildByGuildId(guildId)).toBe(false)
  })

  it("does not delete a different guild's row", async () => {
    await upsertGuildChannel(guildId, channelId)
    await upsertGuildChannel('other-guild-id', channelId)

    await deleteGuildByGuildId(guildId)

    const remaining = await db.select().from(guilds)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.guildId).toBe('other-guild-id')
  })
})
