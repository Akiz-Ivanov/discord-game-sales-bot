import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildBundlesListMessage, MAX_BUNDLES_PER_PAGE } from './bundlesList'
import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'
import { makeBundle } from '@/test/factories'

const getContainer = (
  result: ReturnType<typeof buildBundlesListMessage>
): APIContainerComponent => result.components[0] as APIContainerComponent

const getTexts = (container: APIContainerComponent) =>
  container.components.filter(
    (c): c is APITextDisplayComponent => c.type === ComponentType.TextDisplay
  )

afterEach(() => vi.useRealTimers())

describe('buildBundlesListMessage', () => {
  it('sets the Ephemeral and IsComponentsV2 flags', () => {
    const result = buildBundlesListMessage([makeBundle()])
    expect(result.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
  })

  it('shows an empty-state message with no bundles', () => {
    const result = buildBundlesListMessage([])
    const texts = getTexts(getContainer(result))
    expect(texts[0]!.content).toContain('No active bundles')
    expect(result.components).toHaveLength(1) // no nav row
  })

  it('uses singular phrasing for exactly one bundle', () => {
    const header = getTexts(
      getContainer(buildBundlesListMessage([makeBundle()]))
    )[0]!
    expect(header.content).toContain('1 active bundle')
    expect(header.content).not.toContain('bundles')
  })

  it('uses plural phrasing for multiple bundles', () => {
    const header = getTexts(
      getContainer(
        buildBundlesListMessage([makeBundle({ id: 1 }), makeBundle({ id: 2 })])
      )
    )[0]!
    expect(header.content).toContain('2 active bundles')
  })

  it('links the title, shows shop, game count, and starting price', () => {
    const bundle = makeBundle({ title: 'Dead Cells Bundle' })
    const content = getTexts(
      getContainer(buildBundlesListMessage([bundle]))
    )[1]!.content
    expect(content).toContain(`[Dead Cells Bundle](${bundle.url})`)
    expect(content).toContain(bundle.page.name)
    expect(content).toContain(`${bundle.counts.games} games`)
  })

  it('shows "Price varies" when the first tier has no price', () => {
    const bundle = makeBundle({ tiers: [{ price: null, games: [] }] })
    const content = getTexts(
      getContainer(buildBundlesListMessage([bundle]))
    )[1]!.content
    expect(content).toContain('Price varies')
  })

  describe('days remaining', () => {
    it('shows "Ends today" for an expiry within the same day', () => {
      vi.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00Z'))
      const bundle = makeBundle({ expiry: '2026-09-15T18:00:00Z' })
      const content = getTexts(
        getContainer(buildBundlesListMessage([bundle]))
      )[1]!.content
      expect(content).toContain('Ends today')
    })

    it('shows "1 day left" for an expiry the next day', () => {
      vi.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00Z'))
      const bundle = makeBundle({ expiry: '2026-09-16T12:00:00Z' })
      const content = getTexts(
        getContainer(buildBundlesListMessage([bundle]))
      )[1]!.content
      expect(content).toContain('1 day left')
    })

    it('shows "N days left" for a multi-day expiry', () => {
      vi.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00Z'))
      const bundle = makeBundle({ expiry: '2026-09-20T12:00:00Z' })
      const content = getTexts(
        getContainer(buildBundlesListMessage([bundle]))
      )[1]!.content
      expect(content).toContain('5 days left')
    })

    it('shows "Ends today" for an already-past expiry', () => {
      vi.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00Z'))
      const bundle = makeBundle({ expiry: '2026-09-10T12:00:00Z' })
      const content = getTexts(
        getContainer(buildBundlesListMessage([bundle]))
      )[1]!.content
      expect(content).toContain('Ends today')
    })
  })

  describe('pagination', () => {
    const buildBundles = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        makeBundle({ id: i, title: `Bundle ${i}` })
      )

    it(`caps display at ${MAX_BUNDLES_PER_PAGE} entries per page`, () => {
      const bundles = buildBundles(MAX_BUNDLES_PER_PAGE + 3)
      const container = getContainer(buildBundlesListMessage(bundles))
      // header + separator pairs — subtract header to get entry count
      const entries = getTexts(container).length - 1
      expect(entries).toBe(MAX_BUNDLES_PER_PAGE)
    })

    it('omits the nav row when everything fits on one page', () => {
      const result = buildBundlesListMessage(buildBundles(MAX_BUNDLES_PER_PAGE))
      expect(result.components).toHaveLength(1)
    })

    it('adds a nav row once bundles exceed one page', () => {
      const result = buildBundlesListMessage(
        buildBundles(MAX_BUNDLES_PER_PAGE + 1)
      )
      expect(result.components).toHaveLength(2)
    })

    it('clamps an out-of-range page to the last page', () => {
      const bundles = buildBundles(MAX_BUNDLES_PER_PAGE + 1)
      const container = getContainer(buildBundlesListMessage(bundles, 99))
      const entries = getTexts(container)
      expect(entries[1]!.content).toContain(`Bundle ${MAX_BUNDLES_PER_PAGE}`)
    })
  })
})
