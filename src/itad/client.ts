import type {
  ItadGame,
  ItadLookupResponse,
  ItadSearchResponse,
  ItadGamePrices,
  ItadBundle,
  ItadDealListItem,
  ItadDealsListResponse,
} from '@/types'
import { isPurchasableGame } from '@/lib/isPurchasableGame'

const BASE_URL = 'https://api.isthereanydeal.com'

//* Fuzzy, title-only, can return several matches (incl. DLC/packages).
const SEARCH_URL = `${BASE_URL}/games/search/v1`
//* Exact match by title OR Steam appid — always 0 or 1 result.
const LOOKUP_URL = `${BASE_URL}/games/lookup/v1`
//* Exact match by ITAD's own UUID — richer payload, we only need `id`/`slug`/`title` from it here.
const INFO_URL = `${BASE_URL}/games/info/v2`
const PRICES_URL = `${BASE_URL}/games/prices/v3`
const BUNDLES_URL = `${BASE_URL}/games/bundles/v2`
const DEALS_URL = `${BASE_URL}/deals/v2`
const BUNDLES_LIST_URL = `${BASE_URL}/bundles/v1`

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
  return results.filter(isPurchasableGame)
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

//* This endpoint's activeness isn't guaranteed
//* filtered client-side by expiry as a defensive measure
export const getBundlesForGame = async (
  itadId: string
): Promise<ItadBundle[]> => {
  const url = new URL(BUNDLES_URL)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('id', itadId)

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`ITAD bundles failed: ${res.status} ${await res.text()}`)
  }

  const bundles: ItadBundle[] = await res.json()
  const now = Date.now()
  return bundles.filter((b) => new Date(b.expiry).getTime() > now)
}

//* Homepage-matching "Hottest games" sort — confirmed live against
//* isthereanydeal.com's own frontpage overlap. `-cut` (highest discount)
//* was tried first and rejected: it surfaces 99-100%-off DLC/bundle
//* noise with no relation to what the site actually features.
//* `type` filtering mirrors searchGamesByTitle's package fix.
export const getTrendingDeals = async (
  limit = 30
): Promise<ItadDealListItem[]> => {
  const url = new URL(DEALS_URL)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('country', 'US')
  url.searchParams.set('sort', '-trending')
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`ITAD deals failed: ${res.status} ${await res.text()}`)
  }

  const data: ItadDealsListResponse = await res.json()
  return data.list.filter(isPurchasableGame)
}

//* Global bundle list — sort=expiry (ascending, soonest-expiring-first)
//* confirmed live via requests/itad.rest recon to be a clean monotonic
//* sort with no gaps or mixed grouping. Unlike getBundlesForGame's
//* /games/bundles/v2, this endpoint doesn't need client-side expiry
//* filtering — confirmed live it only ever returns active bundles.
export const getBundlesList = async (limit = 50): Promise<ItadBundle[]> => {
  const url = new URL(BUNDLES_LIST_URL)
  url.searchParams.set('key', getApiKey())
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('sort', 'expiry')

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `ITAD bundles list failed: ${res.status} ${await res.text()}`
    )
  }

  return res.json()
}
