import type {
  ItadGame,
  ItadLookupResponse,
  ItadSearchResponse,
  ItadGamePrices,
} from '@/types/itad'

const BASE_URL = 'https://api.isthereanydeal.com'

function getApiKey(): string {
  const key = process.env.ITAD_API_KEY
  if (!key) throw new Error('ITAD_API_KEY is not set')
  return key
}

export async function searchGames(title: string): Promise<ItadGame[]> {
  const url = new URL(`${BASE_URL}/games/search/v1`)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('title', title)

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`ITAD search failed: ${res.status} ${await res.text()}`)
  }

  const results: ItadSearchResponse = await res.json()
  return results.filter((game) => game.type === 'game')
}

export async function lookupByAppId(appid: number): Promise<ItadGame | null> {
  const url = new URL(`${BASE_URL}/games/lookup/v1`)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('appid', String(appid))

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`ITAD lookup failed: ${res.status} ${await res.text()}`)
  }

  const data: ItadLookupResponse = await res.json()
  return data.found ? (data.game ?? null) : null
}

export async function getPrices(gameIds: string[]): Promise<ItadGamePrices[]> {
  if (gameIds.length === 0) return []
  if (gameIds.length > 200) {
    throw new Error('ITAD prices endpoint accepts at most 200 IDs per request')
  }

  const url = new URL(`${BASE_URL}/games/prices/v3`)
  url.searchParams.set('key', getApiKey())

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gameIds),
  })

  if (!res.ok) {
    throw new Error(`ITAD prices failed: ${res.status} ${await res.text()}`)
  }

  return res.json()
}
