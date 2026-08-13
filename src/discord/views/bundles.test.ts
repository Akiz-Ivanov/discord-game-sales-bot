import { describe, it, expect } from 'vitest'
import { buildBundlesMessage } from './bundles'
import { makeBundle } from '@/test/factories'

describe('buildBundlesMessage', () => {
  it('sets the Ephemeral flag', () => {
    const result = buildBundlesMessage([makeBundle()], 'Dead Cells')
    expect(result.flags).toBeDefined()
  })

  it('shows a "no active bundles" message with no bundles', () => {
    const result = buildBundlesMessage([], 'Fallout 3')
    expect(result.embeds[0].description).toContain(
      'No active bundles currently include **Fallout 3**'
    )
    expect(result.embeds[0].title).toBeUndefined()
  })

  it('sets an accent color distinct from other embeds even in the empty state', () => {
    const result = buildBundlesMessage([], 'Fallout 3')
    expect(result.embeds[0].color).toBe(0xe67e22)
  })

  it('includes the game title and bundle count in the title', () => {
    const result = buildBundlesMessage([makeBundle()], 'Dead Cells')
    expect(result.embeds[0].title).toBe('📦 Dead Cells — 1 active bundle')
  })

  it('uses plural phrasing for multiple bundles', () => {
    const result = buildBundlesMessage(
      [makeBundle({ id: 1 }), makeBundle({ id: 2, title: 'Other Bundle' })],
      'Dead Cells'
    )
    expect(result.embeds[0].title).toContain('2 active bundles')
  })

  it('links the bundle title and shows shop, game count, and starting price', () => {
    const result = buildBundlesMessage([makeBundle()], 'Dead Cells')
    const description = result.embeds[0].description
    expect(description).toContain(
      '[Humble Choice August 2026](https://humblebundle.com/membership/august-2026)'
    )
    expect(description).toContain('Humble Bundle')
    expect(description).toContain('9 games from $14.99')
  })

  it('shows "Free tier" when the first tier has no price', () => {
    const bundle = makeBundle({ tiers: [{ price: null, games: [] }] })
    const result = buildBundlesMessage([bundle], 'Dead Cells')
    expect(result.embeds[0].description).toContain('Free tier')
  })

  it('caps display at 5 bundles and notes how many more exist in the footer', () => {
    const bundles = Array.from({ length: 8 }, (_, i) =>
      makeBundle({ id: i, title: `Bundle ${i}` })
    )
    const result = buildBundlesMessage(bundles, 'Dead Cells')

    expect(result.embeds[0].description?.match(/^\*\*\[Bundle/gm)).toHaveLength(
      5
    )
    expect(result.embeds[0].footer?.text).toBe('+3 more bundle(s) not shown')
  })

  it('omits the footer when everything fits', () => {
    const result = buildBundlesMessage([makeBundle()], 'Dead Cells')
    expect(result.embeds[0].footer).toBeUndefined()
  })
})
