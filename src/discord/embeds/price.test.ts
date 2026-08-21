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
    expect(embed.fields?.[0]?.value).toContain('−33%')
    expect(embed.fields?.[0]?.value).toContain('was $14.99')
  })

  it('omits the discount note when not on sale', () => {
    const embed = buildPriceEmbed(game, [makeDeal({ cut: 0 })])
    expect(embed.fields?.[0]?.value).not.toContain('−')
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

  it('caps display at 5 shops', () => {
    const deals = Array.from({ length: 8 }, (_, i) =>
      makeDeal({
        shop: { id: i, name: `Shop${i}` },
        price: { amount: 10 + i, amountInt: 1000 + i * 100, currency: 'USD' },
      })
    )
    const embed = buildPriceEmbed(game, deals)
    expect(embed.fields?.some((f) => f.name.includes('Shop7'))).toBe(false)
    expect(embed.fields).toHaveLength(5)
  })

  it('appends a "+N more stores" line to the last shown deal field when more exist', () => {
    const deals = Array.from({ length: 8 }, (_, i) =>
      makeDeal({
        shop: { id: i, name: `Shop${i}` },
        price: { amount: 10 + i, amountInt: 1000 + i * 100, currency: 'USD' },
      })
    )
    const embed = buildPriceEmbed(game, deals)
    const lastDealField = embed.fields?.[4]
    expect(lastDealField?.name).toContain('Shop4')
    expect(lastDealField?.value).toContain('+3 more stores')
  })

  it('omits the "+N more stores" line when everything fits', () => {
    const embed = buildPriceEmbed(game, [makeDeal({})])
    expect(embed.fields?.[0]?.value).not.toContain('more stores')
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

  it('links the title to the ITAD game page when urls.game is present', () => {
    const enrichedGame = {
      ...game,
      urls: { game: 'https://isthereanydeal.com/game/hollow-knight/' },
    }
    const embed = buildPriceEmbed(enrichedGame, [makeDeal({})])
    expect(embed.url).toBe('https://isthereanydeal.com/game/hollow-knight/')
  })

  it('leaves the title unlinked when urls is absent (search/lookup paths)', () => {
    const embed = buildPriceEmbed(game, [makeDeal({})])
    expect(embed.url).toBeUndefined()
  })

  describe('enrichment fields', () => {
    it('omits all enrichment fields for a lean game object (search/lookup paths)', () => {
      const embed = buildPriceEmbed(game, [makeDeal({})])
      expect(embed.fields?.some((f) => f.name.includes('Released'))).toBe(false)
      expect(embed.fields?.some((f) => f.name.includes('Reviews'))).toBe(false)
      expect(embed.fields?.some((f) => f.name.includes('Players'))).toBe(false)
      expect(embed.fields?.some((f) => f.name.includes('Tags'))).toBe(false)
    })

    it('includes release date, reviews, players, and tags when present', () => {
      const enrichedGame = {
        ...game,
        releaseDate: '2017-02-24',
        reviews: [{ score: 96, source: 'Steam', count: 489363, url: '' }],
        players: { recent: 10021, day: 10758, week: 11284, peak: 95655 },
        tags: [
          'Metroidvania',
          'Platformer',
          'Souls-like',
          'Difficult',
          'Great Soundtrack',
          'Extra Tag',
        ],
      }
      const embed = buildPriceEmbed(enrichedGame, [makeDeal({})])

      expect(
        embed.fields?.find((f) => f.name.includes('Released'))?.value
      ).toBe('Feb 24, 2017')
      expect(embed.fields?.find((f) => f.name.includes('Reviews'))?.value).toBe(
        '96% (Steam · 489.4K)'
      )
      expect(embed.fields?.find((f) => f.name.includes('Players'))?.value).toBe(
        '10K now · 95.7K peak'
      )
      const tagsValue = embed.fields?.find((f) =>
        f.name.includes('Tags')
      )?.value
      expect(tagsValue).toContain('`Metroidvania`')
      expect(tagsValue).not.toContain('Extra Tag') // capped at 5
    })

    it('prefers the Steam review source over others when multiple are present', () => {
      const enrichedGame = {
        ...game,
        reviews: [
          { score: 87, source: 'Metascore', count: 27, url: '' },
          { score: 96, source: 'Steam', count: 489363, url: '' },
        ],
      }
      const embed = buildPriceEmbed(enrichedGame, [makeDeal({})])
      expect(
        embed.fields?.find((f) => f.name.includes('Reviews'))?.value
      ).toContain('Steam')
    })

    it('falls back to the first review source when Steam is not present', () => {
      const enrichedGame = {
        ...game,
        reviews: [{ score: 87, source: 'Metascore', count: 27, url: '' }],
      }
      const embed = buildPriceEmbed(enrichedGame, [makeDeal({})])
      expect(
        embed.fields?.find((f) => f.name.includes('Reviews'))?.value
      ).toContain('Metascore')
    })

    it('includes enrichment fields on the no-deals branch too', () => {
      const enrichedGame = { ...game, releaseDate: '2017-02-24' }
      const embed = buildPriceEmbed(enrichedGame, [])
      expect(embed.fields?.some((f) => f.name.includes('Released'))).toBe(true)
    })

    it('leaves fields undefined on the no-deals branch when there is no enrichment data', () => {
      const embed = buildPriceEmbed(game, [])
      expect(embed.fields).toBeUndefined()
    })
  })
})
