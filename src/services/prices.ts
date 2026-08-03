import { getPrices } from '@/itad/client'
import {
  getCachedPrices,
  savePrices,
  savePricesBulk,
} from '@/repositories/prices'
import type { ItadDeal, PriceSnapshot } from '@/types'
import { pickCheapestDeal } from '@/lib/pickCheapestDeal'

interface WishlistPriceTarget {
  gameDbId: number
  itadId: string
}

//* Today's prices for a game — from the same-day cache if we've already
//* checked, otherwise a fresh ITAD call (which also updates the cache).
export const getGamePrices = async (
  gameDbId: number,
  itadId: string
): Promise<PriceSnapshot> => {
  const cached = await getCachedPrices(gameDbId)
  if (cached) return cached

  const [priceData] = await getPrices([itadId])
  const deals = priceData?.deals ?? []
  const historyLow = priceData?.historyLow.all

  await savePrices(gameDbId, deals, historyLow)

  return {
    deals,
    historyLowInt: historyLow?.amountInt,
    historyLowCurrency: historyLow?.currency,
  }
}

//* Batched, always-live price fetch for /wishlist list. Deliberately bypasses
//* getGamePrices' same-day cache-READ (freshness matters more than savings
//* here — the list is capped low enough that one extra ITAD call per view is
//* cheap), but still WRITES to the same-day cache so a /price lookup right
//* after benefits. Crucially: never touches wishlist_items.lastNotifiedPrice
//* — that column is cron/add-time-only, viewing the list must never
//* accidentally suppress a future sale alert.
export const getWishlistPrices = async (
  targets: WishlistPriceTarget[]
): Promise<Map<number, ItadDeal | undefined>> => {
  if (targets.length === 0) return new Map()

  const uniqueItadIds = [...new Set(targets.map((t) => t.itadId))]
  const priceData = await getPrices(uniqueItadIds)
  const byItadId = new Map(priceData.map((p) => [p.id, p]))

  const result = new Map<number, ItadDeal | undefined>()
  const bulkEntries = targets.map((target) => {
    const data = byItadId.get(target.itadId)
    const deals = data?.deals ?? []
    result.set(target.gameDbId, pickCheapestDeal(deals))
    return {
      gameDbId: target.gameDbId,
      deals,
      historyLow: data?.historyLow.all,
    }
  })

  await savePricesBulk(bulkEntries)
  return result
}
