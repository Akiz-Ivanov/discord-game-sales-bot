import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFreeGames } from './client'
import type { GamerPowerGiveaway } from '@/types'

const giveaway: GamerPowerGiveaway = {
  id: 3735,
  title: "Tom Clancy's Ghost Recon Future Soldier (Ubisoft) Giveaway",
  worth: '$19.99',
  thumbnail: 'https://www.gamerpower.com/offers/1/6a74ad8b579c3.jpg',
  image: 'https://www.gamerpower.com/offers/1b/6a74ad8b579c3.jpg',
  description: 'Ubisoft is finally back with another giveaway!',
  instructions: '1. Click the button to visit the giveaway page',
  open_giveaway_url:
    'https://www.gamerpower.com/open/tom-clancy-s-ghost-recon-future-soldier-ubisoft-giveaway',
  published_date: '2026-08-06 11:51:39',
  type: 'Game',
  platforms: 'PC, Ubisoft Connect',
  end_date: '2026-08-13 23:59:00',
  users: 13430,
  status: 'Active',
  gamerpower_url:
    'https://www.gamerpower.com/tom-clancy-s-ghost-recon-future-soldier-ubisoft-giveaway',
  open_giveaway:
    'https://www.gamerpower.com/open/tom-clancy-s-ghost-recon-future-soldier-ubisoft-giveaway',
}

const mockResponse = (
  overrides: Partial<Omit<Response, 'json' | 'text'>> & { data?: unknown } = {}
) => {
  const { data, ...rest } = overrides
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data ?? ''),
    ...rest,
  } as Response
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getFreeGames', () => {
  it('builds the request URL with type=game and platform=pc', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: [giveaway] }))

    await getFreeGames()

    const calledUrl = vi.mocked(fetch).mock.calls[0]![0] as URL
    expect(calledUrl.pathname).toBe('/api/giveaways')
    expect(calledUrl.searchParams.get('type')).toBe('game')
    expect(calledUrl.searchParams.get('platform')).toBe('pc')
  })

  it('returns active giveaways from a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: [giveaway] }))

    const result = await getFreeGames()

    expect(result).toEqual([giveaway])
  })

  it('filters out non-Active giveaways even though /giveaways claims active-only', async () => {
    const expired = { ...giveaway, id: 999, status: 'Expired' as const }
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ data: [giveaway, expired] })
    )

    const result = await getFreeGames()

    expect(result).toEqual([giveaway])
  })

  it('returns an empty array on a 201 (no active giveaways) without throwing', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ status: 201, data: null })
    )

    const result = await getFreeGames()

    expect(result).toEqual([])
  })

  it('throws with status and body text on other non-ok statuses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 500, data: 'server error' })
    )

    await expect(getFreeGames()).rejects.toThrow(
      'GamerPower giveaways failed: 500'
    )
  })
})
