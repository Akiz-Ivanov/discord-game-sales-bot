import { describe, it, expect } from 'vitest'
import { buildWishlistListMessage, MAX_ITEMS_PER_PAGE } from './wishlistList'
import {
  ComponentType,
  MessageFlags,
  ButtonStyle,
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'
import type {
  APISectionComponent,
  APIContainerComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'
import { makeGameRow, makeWishlistItemRow, makeDeal } from '@/test/factories'
import type { ItadDeal } from '@/types'

const getContainer = (
  result: ReturnType<typeof buildWishlistListMessage>
): APIContainerComponent => result.components[0] as APIContainerComponent

const getSections = (container: APIContainerComponent) =>
  container.components.filter(
    (c): c is APISectionComponent => c.type === ComponentType.Section
  )

const getContent = (section: APISectionComponent) =>
  (section.components[0] as APITextDisplayComponent).content

const getNavRow = (
  result: ReturnType<typeof buildWishlistListMessage>
): APIActionRowComponent<APIButtonComponentWithCustomId> | undefined =>
  result.components[1] as
    APIActionRowComponent<APIButtonComponentWithCustomId> | undefined

describe('buildWishlistListMessage', () => {
  it('sets the Ephemeral and IsComponentsV2 flags', () => {
    const result = buildWishlistListMessage([], new Map())
    expect(result.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
  })

  it('wraps everything in exactly one Container component', () => {
    const items = [makeWishlistItemRow({ game: makeGameRow({ id: 1 }) })]
    const result = buildWishlistListMessage(items, new Map())

    expect(result.components).toHaveLength(1)
    expect(result.components[0].type).toBe(ComponentType.Container)
  })

  it('sets the container accent color', () => {
    const items = [makeWishlistItemRow({ game: makeGameRow({ id: 1 }) })]
    const container = getContainer(buildWishlistListMessage(items, new Map()))

    expect(container.accent_color).toBe(0x378add)
  })

  it('builds one Section per item, with dividers between but not trailing', () => {
    const items = [
      makeWishlistItemRow({
        id: 1,
        game: makeGameRow({ id: 1, title: 'Hollow Knight' }),
      }),
      makeWishlistItemRow({
        id: 2,
        game: makeGameRow({ id: 2, title: 'Celeste' }),
      }),
    ]
    const container = getContainer(buildWishlistListMessage(items, new Map()))

    expect(getSections(container)).toHaveLength(2)
    const separators = container.components.filter(
      (c) => c.type === ComponentType.Separator
    )
    expect(separators).toHaveLength(1)
  })

  it(`caps display at ${MAX_ITEMS_PER_PAGE} items even with more on the wishlist`, () => {
    const items = Array.from({ length: MAX_ITEMS_PER_PAGE + 3 }, (_, i) =>
      makeWishlistItemRow({
        id: i,
        game: makeGameRow({ id: i, title: `Game ${i}` }),
      })
    )
    const container = getContainer(buildWishlistListMessage(items, new Map()))

    expect(getSections(container)).toHaveLength(MAX_ITEMS_PER_PAGE)
  })

  it('renders the game title in bold on the first line', () => {
    const items = [
      makeWishlistItemRow({
        game: makeGameRow({ id: 1, title: 'Hollow Knight' }),
      }),
    ]
    const container = getContainer(buildWishlistListMessage(items, new Map()))

    expect(getContent(getSections(container)[0])).toContain('**Hollow Knight**')
  })

  it('renders the deal line as subtext below the title', () => {
    const items = [makeWishlistItemRow({ game: makeGameRow({ id: 1 }) })]
    const prices = new Map<number, ItadDeal | undefined>([
      [1, makeDeal({ cut: 25 })],
    ])
    const container = getContainer(buildWishlistListMessage(items, prices))
    const content = getContent(getSections(container)[0])

    expect(content).toContain('-# ')
    expect(content).toContain('−25%')
  })

  it('omits the discount percentage when the deal has no cut', () => {
    const items = [makeWishlistItemRow({ game: makeGameRow({ id: 1 }) })]
    const prices = new Map<number, ItadDeal | undefined>([
      [1, makeDeal({ cut: 0 })],
    ])
    const container = getContainer(buildWishlistListMessage(items, prices))

    expect(getContent(getSections(container)[0])).not.toContain('%')
  })

  it('shows "Price unavailable" when no deal exists for that game', () => {
    const items = [makeWishlistItemRow({ game: makeGameRow({ id: 1 }) })]
    const container = getContainer(buildWishlistListMessage(items, new Map()))

    expect(getContent(getSections(container)[0])).toContain('Price unavailable')
  })

  it('shows "Free" for a zero-price deal', () => {
    const items = [makeWishlistItemRow({ game: makeGameRow({ id: 1 }) })]
    const prices = new Map<number, ItadDeal | undefined>([
      [
        1,
        makeDeal({
          price: { amount: 0, amountInt: 0, currency: 'USD' },
          cut: 0,
        }),
      ],
    ])
    const container = getContainer(buildWishlistListMessage(items, prices))

    expect(getContent(getSections(container)[0])).toContain('Free')
  })

  it('matches each item to its own price by game id, not list order', () => {
    const items = [
      makeWishlistItemRow({
        id: 1,
        game: makeGameRow({ id: 1, title: 'Game A' }),
      }),
      makeWishlistItemRow({
        id: 2,
        game: makeGameRow({ id: 2, title: 'Game B' }),
      }),
    ]
    const prices = new Map<number, ItadDeal | undefined>([
      [1, makeDeal({ cut: 10 })],
      [2, makeDeal({ cut: 90 })],
    ])
    const container = getContainer(buildWishlistListMessage(items, prices))
    const sections = getSections(container)

    // Sorted descending by cut now, so Game B (90%) leads, Game A (10%) follows
    expect(getContent(sections[0])).toContain('−90%')
    expect(getContent(sections[1])).toContain('−10%')
  })

  it('sorts items by discount descending, free games first', () => {
    const items = [
      makeWishlistItemRow({
        id: 1,
        game: makeGameRow({ id: 1, title: 'Full Price' }),
      }),
      makeWishlistItemRow({
        id: 2,
        game: makeGameRow({ id: 2, title: 'Free Game' }),
      }),
      makeWishlistItemRow({
        id: 3,
        game: makeGameRow({ id: 3, title: 'No Data' }),
      }),
    ]
    const prices = new Map<number, ItadDeal | undefined>([
      [1, makeDeal({ cut: 0 })],
      [2, makeDeal({ cut: 100 })],
      // game 3 intentionally has no entry — should sink to the bottom
    ])
    const container = getContainer(buildWishlistListMessage(items, prices))
    const titles = getSections(container).map(getContent)

    expect(titles[0]).toContain('Free Game')
    expect(titles[1]).toContain('Full Price')
    expect(titles[2]).toContain('No Data')
  })

  it('builds a Remove button keyed by the game id, not the wishlist item id', () => {
    const items = [
      makeWishlistItemRow({ id: 999, game: makeGameRow({ id: 42 }) }),
    ]
    const container = getContainer(buildWishlistListMessage(items, new Map()))
    const accessory = getSections(container)[0].accessory

    expect(accessory).toMatchObject({
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      custom_id: 'wishlist_item_remove:42:0',
      emoji: { id: '1533452777471344660', name: 'trash' },
    })
  })
})

describe('pagination', () => {
  const buildItems = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      makeWishlistItemRow({
        id: i,
        game: makeGameRow({ id: i, title: `Game ${i}` }),
      })
    )

  it('omits the nav row when everything fits on one page', () => {
    const result = buildWishlistListMessage(
      buildItems(MAX_ITEMS_PER_PAGE),
      new Map()
    )
    expect(result.components).toHaveLength(1)
  })

  it('adds a nav row once the wishlist exceeds one page', () => {
    const result = buildWishlistListMessage(
      buildItems(MAX_ITEMS_PER_PAGE + 1),
      new Map()
    )
    expect(result.components).toHaveLength(2)
    expect(getNavRow(result)?.type).toBe(ComponentType.ActionRow)
  })

  it('disables Prev on the first page and enables Next', () => {
    const row = getNavRow(
      buildWishlistListMessage(
        buildItems(MAX_ITEMS_PER_PAGE * 2 + 2),
        new Map(),
        0
      )
    )
    expect(row?.components[0].disabled).toBe(true) // Prev
    expect(row?.components[2].disabled).toBe(false) // Next
  })

  it('disables Next on the last page and enables Prev', () => {
    // MAX_ITEMS_PER_PAGE * 2 + 2 items → 3 pages (indices 0-2)
    const row = getNavRow(
      buildWishlistListMessage(
        buildItems(MAX_ITEMS_PER_PAGE * 2 + 2),
        new Map(),
        2
      )
    )
    expect(row?.components[0].disabled).toBe(false) // Prev
    expect(row?.components[2].disabled).toBe(true) // Next
  })

  it('enables both Prev and Next on a middle page', () => {
    const row = getNavRow(
      buildWishlistListMessage(
        buildItems(MAX_ITEMS_PER_PAGE * 2 + 2),
        new Map(),
        1
      )
    )
    expect(row?.components[0].disabled).toBe(false)
    expect(row?.components[2].disabled).toBe(false)
  })

  it('shows a "current / total" page indicator', () => {
    const row = getNavRow(
      buildWishlistListMessage(
        buildItems(MAX_ITEMS_PER_PAGE * 2 + 2),
        new Map(),
        1
      )
    )
    expect(row?.components[1].label).toBe('2 / 3')
    expect(row?.components[1].disabled).toBe(true)
  })

  it('clamps a page number above the valid range down to the last page', () => {
    const items = buildItems(MAX_ITEMS_PER_PAGE + 1) // 2 pages: full page + 1
    const container = getContainer(
      buildWishlistListMessage(items, new Map(), 99)
    )
    const sections = getSections(container)
    expect(sections).toHaveLength(1)
    expect(getContent(sections[0])).toContain(`Game ${MAX_ITEMS_PER_PAGE}`)
  })

  it('clamps a negative page number up to page 0', () => {
    const items = buildItems(MAX_ITEMS_PER_PAGE * 2 + 2)
    const container = getContainer(
      buildWishlistListMessage(items, new Map(), -5)
    )
    const sections = getSections(container)
    expect(getContent(sections[0])).toContain('Game 0')
  })

  it("carries the current page in each item's Remove button custom_id", () => {
    const items = buildItems(MAX_ITEMS_PER_PAGE + 1) // page 1 has exactly one item
    const container = getContainer(
      buildWishlistListMessage(items, new Map(), 1)
    )
    const accessory = getSections(container)[0].accessory
    expect(accessory).toMatchObject({
      custom_id: `wishlist_item_remove:${MAX_ITEMS_PER_PAGE}:1`,
    })
  })
})
