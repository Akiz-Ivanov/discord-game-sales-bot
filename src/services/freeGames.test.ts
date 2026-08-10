// src/services/freeGames.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSortedFreeGames } from './freeGames'
import { getFreeGames } from '@/gamerpower/client'
import { makeGiveaway } from '@/test/factories'

vi.mock('@/gamerpower/client', () => ({ getFreeGames: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('getSortedFreeGames', () => {
  it('sorts newest published_date first regardless of input order', async () => {
    const older = makeGiveaway({ id: 1, published_date: '2026-08-01 10:00:00' })
    const newer = makeGiveaway({ id: 2, published_date: '2026-08-06 11:51:39' })
    vi.mocked(getFreeGames).mockResolvedValue([older, newer])

    const result = await getSortedFreeGames()

    expect(result.map((g) => g.id)).toEqual([2, 1])
  })

  it('returns [] when there are no active giveaways', async () => {
    vi.mocked(getFreeGames).mockResolvedValue([])

    expect(await getSortedFreeGames()).toEqual([])
  })

  it('does not mutate the array returned by getFreeGames', async () => {
    const giveaways = [
      makeGiveaway({ id: 1, published_date: '2026-08-01 10:00:00' }),
      makeGiveaway({ id: 2, published_date: '2026-08-06 11:51:39' }),
    ]
    const original = [...giveaways]
    vi.mocked(getFreeGames).mockResolvedValue(giveaways)

    await getSortedFreeGames()

    expect(giveaways).toEqual(original)
  })
})
