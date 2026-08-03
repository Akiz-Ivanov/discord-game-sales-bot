import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import { games, prices } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCachedPrices, savePrices, savePricesBulk } from './prices'
import { upsertGame } from './games'
import { resetDb } from '@/test/db-reset'
import { game, makeDeal } from '@/test/factories'

const insertGame = async () => upsertGame(game)
const todayDateString = () => new Date().toISOString().slice(0, 10)

describe('getCachedPrices', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('returns null when there are no prices rows at all', async () => {
    const { id } = await insertGame()

    expect(await getCachedPrices(id)).toBeNull()
  })

  it('returns null when prices rows exist but are from a previous UTC day', async () => {
    const { id } = await insertGame()
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)

    await db.insert(prices).values({
      gameId: id,
      shopId: 1,
      shopName: 'Steam',
      priceAmount: 1499,
      regularAmount: 1999,
      cut: 25,
      currency: 'USD',
      url: 'https://example.com',
      checkedDate: yesterday.toISOString().slice(0, 10),
      checkedAt: yesterday,
    })

    expect(await getCachedPrices(id)).toBeNull()
  })

  it('returns a PriceSnapshot when prices rows exist from today', async () => {
    const { id } = await insertGame()

    await db.insert(prices).values({
      gameId: id,
      shopId: 1,
      shopName: 'Steam',
      priceAmount: 1499,
      regularAmount: 1999,
      cut: 25,
      currency: 'USD',
      url: 'https://example.com',
      checkedDate: todayDateString(),
      checkedAt: new Date(),
    })

    const result = await getCachedPrices(id)

    expect(result).not.toBeNull()
    expect(result!.deals).toEqual([
      {
        shop: { name: 'Steam' },
        price: { amountInt: 1499, currency: 'USD' },
        regular: { amountInt: 1999, currency: 'USD' },
        cut: 25,
        url: 'https://example.com',
      },
    ])
  })

  it('includes all deals logged today, from multiple shops', async () => {
    const { id } = await insertGame()

    await db.insert(prices).values([
      {
        gameId: id,
        shopId: 1,
        shopName: 'Steam',
        priceAmount: 1499,
        regularAmount: 1999,
        cut: 25,
        currency: 'USD',
        url: 'https://example.com/steam',
        checkedDate: todayDateString(),
        checkedAt: new Date(),
      },
      {
        gameId: id,
        shopId: 2,
        shopName: 'GOG',
        priceAmount: 1399,
        regularAmount: 1999,
        cut: 30,
        currency: 'USD',
        url: 'https://example.com/gog',
        checkedDate: todayDateString(),
        checkedAt: new Date(),
      },
    ])

    const result = await getCachedPrices(id)

    expect(result!.deals).toHaveLength(2)
    expect(result!.deals.map((d) => d.shop.name).sort()).toEqual([
      'GOG',
      'Steam',
    ])
  })

  it('does not include prices rows belonging to a different game', async () => {
    const { id: gameAId } = await insertGame()
    const { id: gameBId } = await upsertGame({
      ...game,
      id: 'b1b2c3d4-0000-0000-0000-000000000000',
      slug: 'other-game',
      title: 'Other Game',
    })

    await db.insert(prices).values({
      gameId: gameBId,
      shopId: 1,
      shopName: 'Steam',
      priceAmount: 999,
      regularAmount: 999,
      cut: 0,
      currency: 'USD',
      url: 'https://example.com',
      checkedDate: todayDateString(),
      checkedAt: new Date(),
    })

    expect(await getCachedPrices(gameAId)).toBeNull()
  })

  it('includes historyLow fields when set on the games row', async () => {
    const { id } = await insertGame()

    await db
      .update(games)
      .set({ historyLowAmount: 999, historyLowCurrency: 'USD' })
      .where(eq(games.id, id))

    await db.insert(prices).values({
      gameId: id,
      shopId: 1,
      shopName: 'Steam',
      priceAmount: 1499,
      regularAmount: 1999,
      cut: 25,
      currency: 'USD',
      url: 'https://example.com',
      checkedDate: todayDateString(),
      checkedAt: new Date(),
    })

    const result = await getCachedPrices(id)

    expect(result!.historyLowInt).toBe(999)
    expect(result!.historyLowCurrency).toBe('USD')
  })

  it('leaves historyLow fields undefined (not null) when unset on the games row', async () => {
    const { id } = await insertGame()

    await db.insert(prices).values({
      gameId: id,
      shopId: 1,
      shopName: 'Steam',
      priceAmount: 1499,
      regularAmount: 1999,
      cut: 25,
      currency: 'USD',
      url: 'https://example.com',
      checkedDate: todayDateString(),
      checkedAt: new Date(),
    })

    const result = await getCachedPrices(id)

    expect(result!.historyLowInt).toBeUndefined()
    expect(result!.historyLowCurrency).toBeUndefined()
  })

  //* The old "exact UTC midnight" / "one millisecond before midnight" tests
  //* are gone — they probed a `checkedAt >= startOfTodayUTC()` timestamp
  //* comparison that no longer exists. The cache check is now a plain
  //* date-string equality (`checkedDate === today`), so there's no
  //* sub-day boundary left to test; a row either has today's date or it
  //* doesn't. Nothing meaningful is lost by removing them.
})

describe('savePrices', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('inserts one prices row per deal with fields mapped correctly', async () => {
    const { id } = await insertGame()
    const deal = makeDeal()

    await savePrices(id, [deal])

    const rows = await db.select().from(prices).where(eq(prices.gameId, id))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      gameId: id,
      shopId: deal.shop.id,
      shopName: deal.shop.name,
      priceAmount: deal.price.amountInt,
      regularAmount: deal.regular.amountInt,
      cut: deal.cut,
      currency: deal.price.currency,
      url: deal.url,
      checkedDate: todayDateString(),
    })
  })

  it('does not insert rows and does not throw when deals is empty', async () => {
    const { id } = await insertGame()

    await expect(savePrices(id, [])).resolves.not.toThrow()

    const rows = await db.select().from(prices).where(eq(prices.gameId, id))
    expect(rows).toHaveLength(0)
  })

  it('updates games.historyLow* when historyLow is provided', async () => {
    const { id } = await insertGame()

    await savePrices(id, [makeDeal()], {
      amount: 9.99,
      amountInt: 999,
      currency: 'USD',
    })

    const [row] = await db.select().from(games).where(eq(games.id, id))
    expect(row.historyLowAmount).toBe(999)
    expect(row.historyLowCurrency).toBe('USD')
  })

  it('leaves games.historyLow* untouched when historyLow is omitted', async () => {
    const { id } = await insertGame()
    await db
      .update(games)
      .set({ historyLowAmount: 500, historyLowCurrency: 'USD' })
      .where(eq(games.id, id))

    await savePrices(id, [makeDeal()])

    const [row] = await db.select().from(games).where(eq(games.id, id))
    expect(row.historyLowAmount).toBe(500)
    expect(row.historyLowCurrency).toBe('USD')
  })

  it('rejects when gameId does not reference an existing games row', async () => {
    await expect(savePrices(999999, [makeDeal()])).rejects.toThrow()
  })

  it('updates the existing row instead of duplicating on a second same-day save for the same shop', async () => {
    const { id } = await insertGame()
    const dealV1 = makeDeal({
      price: { amount: 14.99, amountInt: 1499, currency: 'USD' },
    })
    const dealV2 = makeDeal({
      price: { amount: 9.99, amountInt: 999, currency: 'USD' },
    })

    await savePrices(id, [dealV1])
    await savePrices(id, [dealV2]) // same shop.id (61, Steam) by default in makeDeal

    const rows = await db.select().from(prices).where(eq(prices.gameId, id))
    expect(rows).toHaveLength(1)
    expect(rows[0].priceAmount).toBe(999)
  })

  it('inserts separate rows for different shops on the same day, without conflict', async () => {
    const { id } = await insertGame()
    const steamDeal = makeDeal({ shop: { id: 61, name: 'Steam' } })
    const gogDeal = makeDeal({ shop: { id: 35, name: 'GOG' } })

    await savePrices(id, [steamDeal, gogDeal])

    const rows = await db.select().from(prices).where(eq(prices.gameId, id))
    expect(rows).toHaveLength(2)
  })

  it('does not conflict with a row from a previous day for the same shop', async () => {
    const { id } = await insertGame()
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)

    await db.insert(prices).values({
      gameId: id,
      shopId: 61,
      shopName: 'Steam',
      priceAmount: 1499,
      regularAmount: 1999,
      cut: 25,
      currency: 'USD',
      url: 'https://example.com',
      checkedDate: yesterday.toISOString().slice(0, 10),
      checkedAt: yesterday,
    })

    await savePrices(id, [makeDeal({ shop: { id: 61, name: 'Steam' } })])

    const rows = await db.select().from(prices).where(eq(prices.gameId, id))
    expect(rows).toHaveLength(2) // yesterday's row untouched, today's is new
  })
})

describe('savePricesBulk', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('writes rows for multiple games in one call', async () => {
    const gameA = await insertGame()
    const gameB = await upsertGame({
      ...game,
      id: 'b1b2c3d4-0000-0000-0000-000000000000',
      slug: 'other-game',
      title: 'Other Game',
    })

    await savePricesBulk([
      { gameDbId: gameA.id, deals: [makeDeal()] },
      {
        gameDbId: gameB.id,
        deals: [makeDeal({ shop: { id: 35, name: 'GOG' } })],
      },
    ])

    const rows = await db.select().from(prices)
    expect(rows).toHaveLength(2)
  })

  it('upserts within a single bulk call rather than duplicating on repeat calls', async () => {
    const { id } = await insertGame()

    await savePricesBulk([{ gameDbId: id, deals: [makeDeal()] }])
    await savePricesBulk([
      {
        gameDbId: id,
        deals: [
          makeDeal({ price: { amount: 5, amountInt: 500, currency: 'USD' } }),
        ],
      },
    ])

    const rows = await db.select().from(prices).where(eq(prices.gameId, id))
    expect(rows).toHaveLength(1)
    expect(rows[0].priceAmount).toBe(500)
  })

  it('updates historyLow per game when provided', async () => {
    const { id } = await insertGame()

    await savePricesBulk([
      {
        gameDbId: id,
        deals: [makeDeal()],
        historyLow: { amount: 4.99, amountInt: 499, currency: 'USD' },
      },
    ])

    const [row] = await db.select().from(games).where(eq(games.id, id))
    expect(row.historyLowAmount).toBe(499)
  })

  it('does nothing and does not throw when entries is empty', async () => {
    await expect(savePricesBulk([])).resolves.not.toThrow()
  })

  it('deduplicates same (game, shop) pairs within one bulk call instead of erroring', async () => {
    const { id } = await insertGame()
    const dupeShopDeals = [
      makeDeal({
        shop: { id: 61, name: 'Steam' },
        price: { amount: 10, amountInt: 1000, currency: 'USD' },
      }),
      makeDeal({
        shop: { id: 61, name: 'Steam' },
        price: { amount: 8, amountInt: 800, currency: 'USD' },
      }),
    ]

    await expect(
      savePricesBulk([{ gameDbId: id, deals: dupeShopDeals }])
    ).resolves.not.toThrow()

    const rows = await db.select().from(prices).where(eq(prices.gameId, id))
    expect(rows).toHaveLength(1)
  })
})
