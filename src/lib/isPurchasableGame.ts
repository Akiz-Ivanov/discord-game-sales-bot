import type { ItadGameType } from '@/types'

//* Shared by searchGamesByTitle and getTrendingDeals — ITAD categorizes
//* some base games (e.g. The Witcher 3) as "package" rather than "game",
//* so both filters need to accept either. Extracted here so this
//* judgment call lives in exactly one place.
export const isPurchasableGame = <T extends { type: ItadGameType }>(
  item: T
): boolean => item.type === 'game' || item.type === 'package'
