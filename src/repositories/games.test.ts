import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import { games } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { upsertGame } from './games'
import { resetDb } from '@/test/db-reset'
import { game } from '@/test/factories'

describe('upsertGame', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('inserts a new game on first call', async () => {
    const row = await upsertGame(game)

    expect(row.itadId).toBe(game.id)
    expect(row.slug).toBe(game.slug)
    expect(row.title).toBe(game.title)
    expect(row.id).toBeTypeOf('number')
  })

  it('updates slug/title in place on re-upsert, keeping the same id', async () => {
    const first = await upsertGame(game)

    const updated = await upsertGame({
      ...game,
      slug: 'hollow-knight-silksong',
      title: 'Hollow Knight: Silksong',
    })

    expect(updated.id).toBe(first.id)
    expect(updated.slug).toBe('hollow-knight-silksong')
    expect(updated.title).toBe('Hollow Knight: Silksong')

    // Confirm it's really an update, not a second row sneaking in
    const rows = await db.select().from(games).where(eq(games.itadId, game.id))
    expect(rows).toHaveLength(1)
  })

  it('is a no-op in effect when re-upserted with identical data', async () => {
    const first = await upsertGame(game)
    const second = await upsertGame(game)

    expect(second).toEqual(first)
  })

  it('does not cross-contaminate rows for different itadIds', async () => {
    const otherGame = {
      ...game,
      id: 'a1b2c3d4-0000-0000-0000-000000000000',
      slug: 'other-game',
      title: 'Other Game',
    }

    const rowA = await upsertGame(game)
    const rowB = await upsertGame(otherGame)

    expect(rowA.id).not.toBe(rowB.id)

    const all = await db.select().from(games)
    expect(all).toHaveLength(2)
  })
})
