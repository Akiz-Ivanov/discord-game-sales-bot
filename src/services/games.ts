import {
  searchGamesByTitle,
  lookupBySteamAppId,
  lookupByItadId,
} from '@/itad/client'
import type { ItadGame } from '@/types'

const ITAD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STEAM_APPID_PATTERN = /^\d+$/

//* Resolves a user's `/price` or `/wishlist add` input to matching ITAD games.
//* Steam appid / ITAD ID inputs are exact matches (0 or 1 result); anything
//* else falls back to fuzzy title search (0 or more results).
export const resolveGame = async (query: string): Promise<ItadGame[]> => {
  if (STEAM_APPID_PATTERN.test(query)) {
    const game = await lookupBySteamAppId(Number(query))
    return game ? [game] : []
  }

  if (ITAD_ID_PATTERN.test(query)) {
    const game = await lookupByItadId(query)
    return game ? [game] : []
  }

  return searchGamesByTitle(query)
}
