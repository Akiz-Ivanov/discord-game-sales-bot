import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGamePrices, getWishlistPrices } from './prices'
import { getPrices } from '@/itad/client'
import {
  getCachedPrices,
  savePrices,
  savePricesBulk,
} from '@/repositories/prices'
import type { ItadGamePrices, PriceSnapshot } from '@/types'
import { makeDeal } from '@/test/factories'

vi.mock('@/itad/client', () => ({ getPrices: vi.fn() }))
vi.mock('@/repositories/prices', () => ({
  getCachedPrices: vi.fn(),
  savePrices: vi.fn(),
  savePricesBulk: vi.fn(),
}))

const gameDbId = 1
const itadId = '018d937f-1ae9-734c-ba47-bd357cf07edd'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getGamePrices — cache hit', () => {
  it('returns the cached snapshot without calling ITAD', async () => {
    const cached: PriceSnapshot = {
      deals: [
        {
          shop: { name: 'Steam' },
          price: { amountInt: 1499, currency: 'USD' },
          regular: { amountInt: 1499, currency: 'USD' },
          cut: 0,
          url: 'https://itad.link/018d9386-75a1-73f0-9fff-3ed650048d61/',
        },
      ],
      historyLowInt: 509,
      historyLowCurrency: 'USD',
    }
    vi.mocked(getCachedPrices).mockResolvedValue(cached)

    const result = await getGamePrices(gameDbId, itadId)

    expect(result).toEqual(cached)
    expect(getPrices).not.toHaveBeenCalled()
  })

  it('does not write to the cache again on a hit', async () => {
    vi.mocked(getCachedPrices).mockResolvedValue({
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })

    await getGamePrices(gameDbId, itadId)

    expect(savePrices).not.toHaveBeenCalled()
  })
})

describe('getGamePrices — cache miss', () => {
  it('fetches from ITAD, saves the result, and returns it in PriceSnapshot shape', async () => {
    vi.mocked(getCachedPrices).mockResolvedValue(null)
    const deal = makeDeal()
    const priceData: ItadGamePrices = {
      id: itadId,
      historyLow: { all: { amount: 5.09, amountInt: 509, currency: 'USD' } },
      deals: [deal],
    }
    vi.mocked(getPrices).mockResolvedValue([priceData])

    const result = await getGamePrices(gameDbId, itadId)

    expect(getPrices).toHaveBeenCalledWith([itadId])
    expect(savePrices).toHaveBeenCalledWith(gameDbId, [deal], {
      amount: 5.09,
      amountInt: 509,
      currency: 'USD',
    })
    expect(result).toEqual({
      deals: [deal],
      historyLowInt: 509,
      historyLowCurrency: 'USD',
    })
  })

  it('handles ITAD returning no entry for the requested id (empty array)', async () => {
    vi.mocked(getCachedPrices).mockResolvedValue(null)
    vi.mocked(getPrices).mockResolvedValue([])

    const result = await getGamePrices(gameDbId, itadId)

    expect(savePrices).toHaveBeenCalledWith(gameDbId, [], undefined)
    expect(result).toEqual({
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
  })

  it('handles a game with no historyLow.all (e.g. never been on sale)', async () => {
    vi.mocked(getCachedPrices).mockResolvedValue(null)
    const priceData: ItadGamePrices = {
      id: itadId,
      historyLow: {},
      deals: [],
    }
    vi.mocked(getPrices).mockResolvedValue([priceData])

    const result = await getGamePrices(gameDbId, itadId)

    expect(savePrices).toHaveBeenCalledWith(gameDbId, [], undefined)
    expect(result.historyLowInt).toBeUndefined()
    expect(result.historyLowCurrency).toBeUndefined()
  })
})

describe('getWishlistPrices', () => {
  it('returns an empty Map without calling ITAD when targets is empty', async () => {
    const result = await getWishlistPrices([])

    expect(result).toEqual(new Map())
    expect(getPrices).not.toHaveBeenCalled()
    expect(savePricesBulk).not.toHaveBeenCalled()
  })

  it('dedupes itadIds across targets before calling getPrices', async () => {
    vi.mocked(getPrices).mockResolvedValue([])

    await getWishlistPrices([
      { gameDbId: 1, itadId },
      { gameDbId: 2, itadId }, // same itadId, different wishlist row/game — shouldn't happen in practice but shouldn't double-fetch either way
    ])

    expect(getPrices).toHaveBeenCalledWith([itadId])
  })

  it('maps each target to its cheapest deal', async () => {
    const cheap = makeDeal({
      price: { amount: 5, amountInt: 500, currency: 'USD' },
    })
    const expensive = makeDeal({
      price: { amount: 10, amountInt: 1000, currency: 'USD' },
    })
    vi.mocked(getPrices).mockResolvedValue([
      { id: itadId, historyLow: {}, deals: [expensive, cheap] },
    ])

    const result = await getWishlistPrices([{ gameDbId, itadId }])

    expect(result.get(gameDbId)).toEqual(cheap)
  })

  it('maps to undefined when ITAD has no entry for that itadId', async () => {
    vi.mocked(getPrices).mockResolvedValue([])

    const result = await getWishlistPrices([{ gameDbId, itadId }])

    expect(result.get(gameDbId)).toBeUndefined()
  })

  it('writes all entries to the cache via savePricesBulk, including historyLow', async () => {
    const deal = makeDeal()
    vi.mocked(getPrices).mockResolvedValue([
      {
        id: itadId,
        historyLow: { all: { amount: 4.99, amountInt: 499, currency: 'USD' } },
        deals: [deal],
      },
    ])

    await getWishlistPrices([{ gameDbId, itadId }])

    expect(savePricesBulk).toHaveBeenCalledWith([
      {
        gameDbId,
        deals: [deal],
        historyLow: { amount: 4.99, amountInt: 499, currency: 'USD' },
      },
    ])
  })
})
