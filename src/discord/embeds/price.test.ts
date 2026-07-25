import { describe, it, expect } from 'vitest'
import { buildPriceEmbed } from './price'
import { makeDeal, game } from '@/test/factories'

describe('buildPriceEmbed', () => {
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
    const embed = buildPriceEmbed(game, deals)
    const names = embed.fields?.map((f) => f.name) ?? []
    const gogIndex = names.findIndex((n) => n.includes('GOG'))
    const humbleIndex = names.findIndex((n) => n.includes('Humble Store'))
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
    const embed = buildPriceEmbed(game, deals)
    expect(embed.fields?.[0].value).toContain('−33%')
    expect(embed.fields?.[0].value).toContain('was $14.99')
  })

  it('omits the discount note when not on sale', () => {
    const embed = buildPriceEmbed(game, [makeDeal({ cut: 0 })])
    expect(embed.fields?.[0].value).not.toContain('−')
  })

  it('picks the on-sale color when any deal has a cut', () => {
    const embed = buildPriceEmbed(game, [makeDeal({ cut: 20 })])
    expect(embed.color).toBe(0x57f287)
  })

  it('picks the no-sale color when no deal has a cut', () => {
    const embed = buildPriceEmbed(game, [makeDeal({ cut: 0 })])
    expect(embed.color).toBe(0x5865f2)
  })

  it('returns a "no listings" description when deals is empty', () => {
    const embed = buildPriceEmbed(game, [])
    expect(embed.description).toContain('No store currently lists a price')
    expect(embed.color).toBe(0x99aab5)
    expect(embed.title).toBe('Hollow Knight')
  })

  it('caps display at 5 shops and notes how many more exist in the footer', () => {
    const deals = Array.from({ length: 8 }, (_, i) =>
      makeDeal({
        shop: { id: i, name: `Shop${i}` },
        price: { amount: 10 + i, amountInt: 1000 + i * 100, currency: 'USD' },
      })
    )
    const embed = buildPriceEmbed(game, deals)
    expect(embed.fields?.some((f) => f.name.includes('Shop7'))).toBe(false)
    expect(embed.footer?.text).toBe('+3 more shop(s) not shown')
  })

  it('includes a historical low field when provided', () => {
    const embed = buildPriceEmbed(game, [makeDeal({})], 509, 'USD')
    const historyField = embed.fields?.find((f) =>
      f.name.includes('Historical low')
    )
    expect(historyField?.value).toBe('$5.09')
  })

  it('omits the historical low field when not provided', () => {
    const embed = buildPriceEmbed(game, [makeDeal({})])
    expect(embed.fields?.some((f) => f.name.includes('Historical low'))).toBe(
      false
    )
  })

  it('includes the game ID as a code-formatted field', () => {
    const embed = buildPriceEmbed(game, [makeDeal({})])
    const idField = embed.fields?.find((f) => f.name === 'ITAD ID')
    expect(idField?.value).toBe('`018d937f-1ae9-734c-ba47-bd357cf07edd`')
  })

  it('includes the game ID even when no store lists a price', () => {
    const embed = buildPriceEmbed(game, [])
    const idField = embed.fields?.find((f) => f.name === 'ITAD ID')
    expect(idField?.value).toBe('`018d937f-1ae9-734c-ba47-bd357cf07edd`')
  })
})
