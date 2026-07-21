// src/discord/commands/price.test.ts
import { describe, it, expect } from 'vitest'
import { formatMoney, formatDealsReply } from './price'
import type { ItadGame, ItadDeal } from '@/types/itad'

const game: ItadGame = {
  id: '018d937f-1ae9-734c-ba47-bd357cf07edd',
  slug: 'hollow-knight',
  title: 'Hollow Knight',
  type: 'game',
  mature: false,
  assets: {},
}

const makeDeal = (overrides: Partial<ItadDeal>): ItadDeal => {
  return {
    shop: { id: 61, name: 'Steam' },
    price: { amount: 14.99, amountInt: 1499, currency: 'USD' },
    regular: { amount: 14.99, amountInt: 1499, currency: 'USD' },
    cut: 0,
    voucher: null,
    storeLow: null,
    flag: null,
    drm: [],
    platforms: [],
    timestamp: '2026-07-09T19:23:15+02:00',
    expiry: null,
    url: 'https://itad.link/example/',
    ...overrides,
  }
}

describe('formatMoney', () => {
  it('formats integer cents as a decimal with currency', () => {
    expect(formatMoney(1499, 'USD')).toBe('14.99 USD')
  })

  it('handles zero correctly', () => {
    expect(formatMoney(0, 'USD')).toBe('0.00 USD')
  })
})

describe('formatDealsReply', () => {
  it('sorts deals cheapest-first regardless of input order', () => {
    const deals = [
      makeDeal({
        shop: { id: 37, name: 'Humble Store' },
        price: { amount: 19.99, amountInt: 1999, currency: 'USD' },
      }),
      makeDeal({
        shop: { id: 35, name: 'GOG' },
        price: { amount: 9.99, amountInt: 999, currency: 'USD' },
      }),
    ]
    const result = formatDealsReply(game, deals)
    const gogIndex = result.indexOf('GOG')
    const humbleIndex = result.indexOf('Humble Store')
    expect(gogIndex).toBeGreaterThan(-1)
    expect(gogIndex).toBeLessThan(humbleIndex)
  })

  it('shows the discount and original price when on sale', () => {
    const deals = [
      makeDeal({
        cut: 33,
        regular: { amount: 14.99, amountInt: 1499, currency: 'USD' },
      }),
    ]
    const result = formatDealsReply(game, deals)
    expect(result).toContain('−33%')
    expect(result).toContain('was 14.99 USD')
  })

  it('omits the discount note when not on sale', () => {
    const result = formatDealsReply(game, [makeDeal({ cut: 0 })])
    expect(result).not.toContain('−')
  })

  it('returns a "no listings" message when deals is empty', () => {
    const result = formatDealsReply(game, [])
    expect(result).toContain('No store currently lists a price')
    expect(result).toContain('Hollow Knight')
  })

  it('caps display at 5 shops and notes how many more exist', () => {
    const deals = Array.from({ length: 8 }, (_, i) =>
      makeDeal({
        shop: { id: i, name: `Shop${i}` },
        price: { amount: 10 + i, amountInt: 1000 + i * 100, currency: 'USD' },
      })
    )
    const result = formatDealsReply(game, deals)
    expect(result).toContain('+3 more shop(s)')
    expect(result).not.toContain('Shop7')
  })

  it('includes historical low when provided', () => {
    const result = formatDealsReply(game, [makeDeal({})], 509, 'USD')
    expect(result).toContain('Historical low: 5.09 USD')
  })

  it('omits historical low line when not provided', () => {
    const result = formatDealsReply(game, [makeDeal({})])
    expect(result).not.toContain('Historical low')
  })

  it('includes the game ID as a copyable code block', () => {
    const result = formatDealsReply(game, [makeDeal({})])
    expect(result).toContain('```018d937f-1ae9-734c-ba47-bd357cf07edd```')
  })

  it('includes the game ID even when no store lists a price', () => {
    const result = formatDealsReply(game, [])
    expect(result).toContain('```018d937f-1ae9-734c-ba47-bd357cf07edd```')
  })
})
