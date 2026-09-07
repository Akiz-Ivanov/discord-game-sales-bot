import { describe, it, expect } from 'vitest'
import { buildTrendingMessage, MAX_TRENDING_PER_PAGE } from './trending'
import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'
import { makeDealListItem, makeDeal } from '@/test/factories'

const getContainer = (
  result: ReturnType<typeof buildTrendingMessage>
): APIContainerComponent => result.components[0] as APIContainerComponent

const getTexts = (container: APIContainerComponent) =>
  container.components.filter(
    (c): c is APITextDisplayComponent => c.type === ComponentType.TextDisplay
  )

describe('buildTrendingMessage', () => {
  it('sets the Ephemeral and IsComponentsV2 flags', () => {
    const result = buildTrendingMessage([makeDealListItem()])
    expect(result.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
  })

  it('builds one entry with title link, price, and shop', () => {
    const item = makeDealListItem({ title: 'Hollow Knight' })
    const content = getTexts(getContainer(buildTrendingMessage([item])))[1]!
      .content
    expect(content).toContain('[Hollow Knight]')
    expect(content).toContain('Steam')
  })

  it('bolds the current price', () => {
    const item = makeDealListItem({ deal: makeDeal({ cut: 0 }) })
    const content = getTexts(getContainer(buildTrendingMessage([item])))[1]!
      .content
    expect(content).toContain('**$14.99**')
  })

  it('shows discount and was-price when on sale', () => {
    const item = makeDealListItem({
      deal: makeDeal({
        cut: 50,
        price: { amount: 7.5, amountInt: 750, currency: 'USD' },
        regular: { amount: 14.99, amountInt: 1499, currency: 'USD' },
      }),
    })
    const content = getTexts(getContainer(buildTrendingMessage([item])))[1]!
      .content
    expect(content).toContain('−50%')
    expect(content).toContain('was $14.99')
  })

  it('bolds the current price', () => {
    const item = makeDealListItem({ deal: makeDeal({ cut: 0 }) })
    const content = getTexts(getContainer(buildTrendingMessage([item])))[1]!
      .content
    expect(content).toContain('**$14.99**')
  })

  it.each([
    ['N', 'New historical low'],
    ['H', 'Historical low'],
    ['S', 'Lowest store price'],
  ])('shows the correct label for flag %s', (flag, label) => {
    const item = makeDealListItem({ deal: makeDeal({ flag }) })
    const content = getTexts(getContainer(buildTrendingMessage([item])))[1]!
      .content
    expect(content).toContain(label)
  })

  it('omits the flag label when flag is null', () => {
    const item = makeDealListItem({ deal: makeDeal({ flag: null }) })
    const content = getTexts(getContainer(buildTrendingMessage([item])))[1]!
      .content
    expect(content).not.toContain('New historical low')
    expect(content).not.toContain('Historical low')
    expect(content).not.toContain('Lowest store price')
  })

  it('includes a footer linking to the full deals page', () => {
    const texts = getTexts(
      getContainer(buildTrendingMessage([makeDealListItem()]))
    )
    const footer = texts[texts.length - 1]!
    expect(footer.content).toContain('https://isthereanydeal.com/deals/')
  })

  it(`caps display at ${MAX_TRENDING_PER_PAGE} entries per page`, () => {
    const items = Array.from({ length: MAX_TRENDING_PER_PAGE + 3 }, (_, i) =>
      makeDealListItem({ id: `id-${i}`, title: `Game ${i}` })
    )
    const container = getContainer(buildTrendingMessage(items))
    // header + footer are TextDisplays too, so subtract those from the total
    const entryCount = getTexts(container).length - 2
    expect(entryCount).toBe(MAX_TRENDING_PER_PAGE)
  })

  it('omits the nav row when everything fits on one page', () => {
    const result = buildTrendingMessage([makeDealListItem()])
    expect(result.components).toHaveLength(1)
  })

  it('adds a nav row once entries exceed one page', () => {
    const items = Array.from({ length: MAX_TRENDING_PER_PAGE + 1 }, (_, i) =>
      makeDealListItem({ id: `id-${i}` })
    )
    const result = buildTrendingMessage(items)
    expect(result.components).toHaveLength(2)
  })

  it('clamps an out-of-range page to the last page', () => {
    const items = Array.from({ length: MAX_TRENDING_PER_PAGE + 1 }, (_, i) =>
      makeDealListItem({ id: `id-${i}`, title: `Game ${i}` })
    )
    const container = getContainer(buildTrendingMessage(items, 99))
    const entries = getTexts(container)
    expect(entries[1]!.content).toContain(`Game ${MAX_TRENDING_PER_PAGE}`)
  })
})
