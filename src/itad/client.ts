import type {
  ItadGame,
  ItadLookupResponse,
  ItadSearchResponse,
  ItadGamePrices,
} from '@/types'

const BASE_URL = 'https://api.isthereanydeal.com'

//* Fuzzy, title-only, can return several matches (incl. DLC/packages).
const SEARCH_URL = `${BASE_URL}/games/search/v1`
//* Exact match by title OR Steam appid — always 0 or 1 result.
const LOOKUP_URL = `${BASE_URL}/games/lookup/v1`
//* Exact match by ITAD's own UUID — richer payload, we only need `id`/`slug`/`title` from it here.
const INFO_URL = `${BASE_URL}/games/info/v2`
const PRICES_URL = `${BASE_URL}/games/prices/v3`

const getApiKey = (): string => {
  const key = process.env.ITAD_API_KEY
  if (!key) throw new Error('ITAD_API_KEY is not set')
  return key
}

//* Fuzzy title search — may return multiple candidates, caller disambiguates.
export const searchGamesByTitle = async (
  title: string
): Promise<ItadGame[]> => {
  const url = new URL(SEARCH_URL)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('title', title)

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`ITAD search failed: ${res.status} ${await res.text()}`)
  }

  const results: ItadSearchResponse = await res.json()
  return results.filter((game) => game.type === 'game')
}

//* Exact match by Steam App ID — user typed a number.
export const lookupBySteamAppId = async (
  appid: number
): Promise<ItadGame | null> => {
  const url = new URL(LOOKUP_URL)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('appid', String(appid))

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`ITAD lookup failed: ${res.status} ${await res.text()}`)
  }

  const data: ItadLookupResponse = await res.json()
  return data.found ? (data.game ?? null) : null
}

//* Exact match by ITAD's own UUID — user pasted back an ID from a previous reply.
export const lookupByItadId = async (
  itadId: string
): Promise<ItadGame | null> => {
  const url = new URL(INFO_URL)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('id', itadId)

  const res = await fetch(url)

  if (res.status === 404) return null

  if (!res.ok) {
    throw new Error(`ITAD info failed: ${res.status} ${await res.text()}`)
  }

  //* /games/info/v2 returns extra fields (tags, reviews, players, etc.) we
  //* don't type or need — ItadGame's fields are a subset, so this is safe.
  return res.json()
}

export const getPrices = async (
  gameIds: string[]
): Promise<ItadGamePrices[]> => {
  if (gameIds.length === 0) return []
  if (gameIds.length > 200) {
    throw new Error('ITAD prices endpoint accepts at most 200 IDs per request')
  }

  const url = new URL(PRICES_URL)
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
