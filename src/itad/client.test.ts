import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  searchGamesByTitle,
  lookupBySteamAppId,
  lookupByItadId,
  getPrices,
} from './client'
import { game } from '@/test/factories'
import type { ItadGamePrices } from '@/types'

const dlc = {
  ...game,
  id: 'some-dlc-id',
  title: 'Hollow Knight DLC',
  type: 'dlc' as const,
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
  vi.stubEnv('ITAD_API_KEY', 'test-key')
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('missing API key', () => {
  it('throws before making a request when ITAD_API_KEY is not set', async () => {
    vi.unstubAllEnvs()
    await expect(searchGamesByTitle('Hollow Knight')).rejects.toThrow(
      'ITAD_API_KEY is not set'
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('searchGamesByTitle', () => {
  it('builds the request URL with title and key params', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: [game] }))

    await searchGamesByTitle('Hollow Knight')

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as URL
    expect(calledUrl.pathname).toBe('/games/search/v1')
    expect(calledUrl.searchParams.get('title')).toBe('Hollow Knight')
    expect(calledUrl.searchParams.get('key')).toBe('test-key')
  })

  it('filters results down to type === "game"', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: [game, dlc] }))

    const result = await searchGamesByTitle('Hollow Knight')

    expect(result).toEqual([game])
  })

  it('returns an empty array when nothing matches', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: [] }))

    const result = await searchGamesByTitle('asdkfjhaskdjfh')

    expect(result).toEqual([])
  })

  it('throws with status and body text when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 500, data: 'server error' })
    )

    await expect(searchGamesByTitle('x')).rejects.toThrow(
      'ITAD search failed: 500'
    )
  })
})

describe('lookupBySteamAppId', () => {
  it('builds the request URL with appid and key params', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ data: { found: true, game } })
    )

    await lookupBySteamAppId(367520)

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as URL
    expect(calledUrl.pathname).toBe('/games/lookup/v1')
    expect(calledUrl.searchParams.get('appid')).toBe('367520')
  })

  it('returns the game when found is true', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ data: { found: true, game } })
    )

    const result = await lookupBySteamAppId(367520)

    expect(result).toEqual(game)
  })

  it('returns null when found is false', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: { found: false } }))

    const result = await lookupBySteamAppId(999999999)

    expect(result).toBeNull()
  })

  it('throws with status and body text when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 500, data: 'server error' })
    )

    await expect(lookupBySteamAppId(1)).rejects.toThrow(
      'ITAD lookup failed: 500'
    )
  })
})

describe('lookupByItadId', () => {
  const uuid = '018d937f-1ae9-734c-ba47-bd357cf07edd'

  it('builds the request URL with id and key params', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: game }))

    await lookupByItadId(uuid)

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as URL
    expect(calledUrl.pathname).toBe('/games/info/v2')
    expect(calledUrl.searchParams.get('id')).toBe(uuid)
  })

  it('returns the game on a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: game }))

    const result = await lookupByItadId(uuid)

    expect(result).toEqual(game)
  })

  it('returns null on a 404 instead of throwing', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ ok: false, status: 404 }))

    const result = await lookupByItadId(uuid)

    expect(result).toBeNull()
  })

  it('throws on other non-ok statuses (404 is special-cased, others are not)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 500, data: 'server error' })
    )

    await expect(lookupByItadId(uuid)).rejects.toThrow('ITAD info failed: 500')
  })
})

describe('getPrices', () => {
  it('returns [] immediately without calling fetch when given no ids', async () => {
    const result = await getPrices([])

    expect(result).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws without calling fetch when given more than 200 ids', async () => {
    const tooMany = Array.from({ length: 201 }, (_, i) => `id-${i}`)

    await expect(getPrices(tooMany)).rejects.toThrow('at most 200 IDs')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('POSTs the game ids as a JSON body with the right headers', async () => {
    const priceData: ItadGamePrices[] = [
      { id: game.id, historyLow: {}, deals: [] },
    ]
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: priceData }))

    await getPrices([game.id])

    const [calledUrl, options] = vi.mocked(fetch).mock.calls[0]
    expect((calledUrl as URL).pathname).toBe('/games/prices/v3')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(options?.body).toBe(JSON.stringify([game.id]))
  })

  it('returns the parsed price data on success', async () => {
    const priceData: ItadGamePrices[] = [
      { id: game.id, historyLow: {}, deals: [] },
    ]
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: priceData }))

    const result = await getPrices([game.id])

    expect(result).toEqual(priceData)
  })

  it('throws with status and body text when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 500, data: 'server error' })
    )

    await expect(getPrices([game.id])).rejects.toThrow(
      'ITAD prices failed: 500'
    )
  })
})
