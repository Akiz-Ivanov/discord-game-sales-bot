import { getPrices } from '@/itad/client'
import { getCachedPrices, savePrices } from '@/repositories/prices'
import type { PriceSnapshot } from '@/types'

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
