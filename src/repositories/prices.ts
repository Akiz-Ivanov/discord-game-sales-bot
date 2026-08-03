import { db } from '@/db'
import { games, prices } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { ItadDeal, ItadMoney, PriceSnapshot } from '@/types'
import { buildConflictUpdateColumns } from '@/db/buildConflictUpdateColumns'

//* "YYYY-MM-DD" in UTC — matches the `date` column's string mode (Drizzle
//* doesn't convert `date` columns to JS Date objects unless told to)
const todayDateString = () => new Date().toISOString().slice(0, 10)

export const getCachedPrices = async (
  gameDbId: number
): Promise<PriceSnapshot | null> => {
  const rows = await db
    .select()
    .from(prices)
    .where(
      and(
        eq(prices.gameId, gameDbId),
        eq(prices.checkedDate, todayDateString())
      )
    )

  if (rows.length === 0) return null

  const [gameRow] = await db.select().from(games).where(eq(games.id, gameDbId))

  return {
    deals: rows.map((r) => ({
      shop: { name: r.shopName },
      price: { amountInt: r.priceAmount, currency: r.currency },
      regular: { amountInt: r.regularAmount, currency: r.currency },
      cut: r.cut,
      url: r.url,
    })),
    historyLowInt: gameRow?.historyLowAmount ?? undefined,
    historyLowCurrency: gameRow?.historyLowCurrency ?? undefined,
  }
}

export const savePrices = async (
  gameDbId: number,
  deals: ItadDeal[],
  historyLow?: ItadMoney
) => {
  await savePricesBulk([{ gameDbId, deals, historyLow }])
}

export const savePricesBulk = async (
  entries: { gameDbId: number; deals: ItadDeal[]; historyLow?: ItadMoney }[]
) => {
  const checkedDate = todayDateString()

  //* Dedup by (gameId, shopId) before building the INSERT batch — Postgres's
  //* ON CONFLICT DO UPDATE can't touch the same target row twice in one
  //* statement, and ITAD's own deals array isn't guaranteed to be
  //* shop-unique per game. Last write wins per key.
  const dedupedRows = new Map<string, typeof prices.$inferInsert>()

  for (const { gameDbId, deals } of entries) {
    for (const d of deals) {
      const key = `${gameDbId}:${d.shop.id}`
      dedupedRows.set(key, {
        gameId: gameDbId,
        shopId: d.shop.id,
        shopName: d.shop.name,
        priceAmount: d.price.amountInt,
        regularAmount: d.regular.amountInt,
        cut: d.cut,
        currency: d.price.currency,
        url: d.url,
        checkedDate,
      })
    }
  }

  const allRows = [...dedupedRows.values()]

  if (allRows.length > 0) {
    await db
      .insert(prices)
      .values(allRows)
      .onConflictDoUpdate({
        target: [prices.gameId, prices.shopId, prices.checkedDate],
        set: buildConflictUpdateColumns(prices, [
          'priceAmount',
          'regularAmount',
          'cut',
          'currency',
          'url',
          'checkedAt',
        ]),
      })
  }

  await Promise.all(
    entries
      .filter((e) => e.historyLow)
      .map((e) =>
        db
          .update(games)
          .set({
            historyLowAmount: e.historyLow!.amountInt,
            historyLowCurrency: e.historyLow!.currency,
          })
          .where(eq(games.id, e.gameDbId))
      )
  )
}
