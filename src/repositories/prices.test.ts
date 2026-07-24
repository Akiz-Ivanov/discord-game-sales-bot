import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import { games, prices } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCachedPrices, savePrices } from './prices'
import { upsertGame } from './games'
import { resetDb } from '@/test/db-reset'
import { game, makeDeal } from '@/test/factories'

const insertGame = async () => upsertGame(game)

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
      checkedAt: new Date(),
    })

    const result = await getCachedPrices(id)

    expect(result!.historyLowInt).toBeUndefined()
    expect(result!.historyLowCurrency).toBeUndefined()
  })

  it("includes a row logged exactly at today's UTC midnight boundary", async () => {
    const { id } = await insertGame()
    const midnight = new Date(new Date().toISOString().slice(0, 10))

    await db.insert(prices).values({
      gameId: id,
      shopId: 1,
      shopName: 'Steam',
      priceAmount: 1499,
      regularAmount: 1999,
      cut: 25,
      currency: 'USD',
      url: 'https://example.com',
      checkedAt: midnight,
    })

    expect(await getCachedPrices(id)).not.toBeNull()
  })

  it("excludes a row logged one millisecond before today's UTC midnight", async () => {
    const { id } = await insertGame()
    const justBefore = new Date(
      new Date(new Date().toISOString().slice(0, 10)).getTime() - 1
    )

    await db.insert(prices).values({
      gameId: id,
      shopId: 1,
      shopName: 'Steam',
      priceAmount: 1499,
      regularAmount: 1999,
      cut: 25,
      currency: 'USD',
      url: 'https://example.com',
      checkedAt: justBefore,
    })

    expect(await getCachedPrices(id)).toBeNull()
  })
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
})
