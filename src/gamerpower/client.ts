import type { GamerPowerGiveaway } from '@/types'

const BASE_URL = 'https://www.gamerpower.com/api'

//* No API key or auth — GamerPower's API is free and unauthenticated,
//* rate-limited to 10 req/sec (plenty of headroom for a once-daily cron
//* plus an occasional /free command). Scoped to type=game (server-side
//* filters out DLC/loot/beta) and platform=pc (keeps this aligned with
//* the rest of the bot's PC-only world — ITAD has no console pricing
//* either, so this isn't a new scope decision, just a consistent one).
export const getFreeGames = async (): Promise<GamerPowerGiveaway[]> => {
  const url = new URL(`${BASE_URL}/giveaways`)
  url.searchParams.set('type', 'game')
  url.searchParams.set('platform', 'pc')

  const res = await fetch(url)

  //* Docs list 201 as "No active giveaways" — a valid empty state, not
  //* an error, so it's handled before the throw below.
  if (res.status === 201) return []

  if (!res.ok) {
    throw new Error(
      `GamerPower giveaways failed: ${res.status} ${await res.text()}`
    )
  }

  const giveaways: GamerPowerGiveaway[] = await res.json()

  //* Defensive: /giveaways is documented as active-only, but a single
  //* giveaway lookup (games/giveaway?id=) returned status: "Expired"
  //* during manual testing, so status is checked explicitly rather than
  //* trusted from the endpoint's own description.
  return giveaways.filter((g) => g.status === 'Active')
}
