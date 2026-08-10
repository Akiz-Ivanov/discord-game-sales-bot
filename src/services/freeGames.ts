import { getFreeGames } from '@/gamerpower/client'
import type { GamerPowerGiveaway } from '@/types'

export const getSortedFreeGames = async (): Promise<GamerPowerGiveaway[]> => {
  const giveaways = await getFreeGames()
  return [...giveaways].sort((a, b) =>
    b.published_date.localeCompare(a.published_date)
  )
}
