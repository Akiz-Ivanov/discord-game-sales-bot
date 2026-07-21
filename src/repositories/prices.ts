import { db } from '@/db'
import { games, prices } from '@/db/schema'
import { eq, gte, and } from 'drizzle-orm'
import type { ItadDeal, ItadMoney, PriceSnapshot } from '@/types'

// Midnight UTC. A "day" here is a calendar-UTC day, not the user's local
// day — simplest thing that works; revisit only if someone actually
// complains about a cache boundary crossing at a weird local hour.
const startOfTodayUTC = () => new Date(new Date().toISOString().slice(0, 10))

// null = no check logged yet today → caller should hit ITAD.
export const getCachedPrices = async (
  gameDbId: number
): Promise<PriceSnapshot | null> => {
  const rows = await db
    .select()
    .from(prices)
    .where(
      and(eq(prices.gameId, gameDbId), gte(prices.checkedAt, startOfTodayUTC()))
    )

  if (rows.length === 0) return null

  const [gameRow] = await db.select().from(games).where(eq(games.id, gameDbId))

  return {
    deals: rows.map((r) => ({
      shop: { name: r.shopName },
      price: { amountInt: r.priceAmount, currency: r.currency },
      regular: { amountInt: r.regularAmount, currency: r.currency },
      cut: r.cut,
    })),
    historyLowInt: gameRow?.historyLowAmount ?? undefined,
    historyLowCurrency: gameRow?.historyLowCurrency ?? undefined,
  }
}

// One prices row per shop deal, plus a rolling update to the game's
// all-time low. Call right after a live ITAD call.
export const savePrices = async (
  gameDbId: number,
  deals: ItadDeal[],
  historyLow?: ItadMoney
) => {
  if (deals.length > 0) {
    await db.insert(prices).values(
      deals.map((d) => ({
        gameId: gameDbId,
        shopId: d.shop.id,
        shopName: d.shop.name,
        priceAmount: d.price.amountInt,
        regularAmount: d.regular.amountInt,
        cut: d.cut,
        currency: d.price.currency,
        url: d.url,
      }))
    )
  }

  if (historyLow) {
    await db
      .update(games)
      .set({
        historyLowAmount: historyLow.amountInt,
        historyLowCurrency: historyLow.currency,
      })
      .where(eq(games.id, gameDbId))
  }
}
