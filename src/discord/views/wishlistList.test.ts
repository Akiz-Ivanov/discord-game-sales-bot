import { describe, it, expect } from 'vitest'
import { buildWishlistListMessage } from './wishlistList'
import { ComponentType, MessageFlags, ButtonStyle } from 'discord-api-types/v10'
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

  it('caps display at 8 items even with more on the wishlist', () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      makeWishlistItemRow({
        id: i,
        game: makeGameRow({ id: i, title: `Game ${i}` }),
      })
    )
    const container = getContainer(buildWishlistListMessage(items, new Map()))

    expect(getSections(container)).toHaveLength(8)
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

    expect(getContent(sections[0])).toContain('−10%')
    expect(getContent(sections[1])).toContain('−90%')
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
      custom_id: 'wishlist_item_remove:42',
      emoji: { id: '1533452777471344660', name: 'trash' },
    })
  })
})
