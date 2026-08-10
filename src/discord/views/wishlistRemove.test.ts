import { describe, it, expect } from 'vitest'
import {
  buildWishlistRemoveMessage,
  MAX_REMOVE_OPTIONS_PER_PAGE,
} from './wishlistRemove'
import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIStringSelectComponent,
} from 'discord-api-types/v10'
import { makeGameRow, makeWishlistItemRow } from '@/test/factories'

const buildItems = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    makeWishlistItemRow({
      id: i,
      game: makeGameRow({ id: i, title: `Game ${i}` }),
    })
  )

const getSelect = (result: ReturnType<typeof buildWishlistRemoveMessage>) =>
  (result.components[0] as APIActionRowComponent<APIStringSelectComponent>)
    .components[0]

describe('buildWishlistRemoveMessage', () => {
  it('sets the Ephemeral flag and standard content', () => {
    const result = buildWishlistRemoveMessage(buildItems(1))
    expect(result.flags).toBe(MessageFlags.Ephemeral)
    expect(result.content).toBe('Select a game to remove:')
  })

  it('builds one select option per item, capped at 25', () => {
    const result = buildWishlistRemoveMessage(buildItems(30))
    expect(getSelect(result).options).toHaveLength(MAX_REMOVE_OPTIONS_PER_PAGE)
  })

  it('truncates option labels at 100 characters', () => {
    const items = [
      makeWishlistItemRow({ game: makeGameRow({ title: 'A'.repeat(150) }) }),
    ]
    const select = getSelect(buildWishlistRemoveMessage(items))
    expect(select.options[0].label).toHaveLength(100)
  })

  it('omits the nav row when everything fits on one page', () => {
    const result = buildWishlistRemoveMessage(
      buildItems(MAX_REMOVE_OPTIONS_PER_PAGE)
    )
    expect(result.components).toHaveLength(1)
  })

  it('adds a nav row once the wishlist exceeds one page', () => {
    const result = buildWishlistRemoveMessage(
      buildItems(MAX_REMOVE_OPTIONS_PER_PAGE + 1)
    )
    expect(result.components).toHaveLength(2)
    expect(result.components[1].type).toBe(ComponentType.ActionRow)
  })

  it('shows the second page of options when page is 1', () => {
    const items = buildItems(MAX_REMOVE_OPTIONS_PER_PAGE + 1)
    const select = getSelect(buildWishlistRemoveMessage(items, 1))
    expect(select.options).toHaveLength(1)
    expect(select.options[0].label).toBe(`Game ${MAX_REMOVE_OPTIONS_PER_PAGE}`)
  })

  it('clamps an out-of-range page down to the last page', () => {
    const items = buildItems(MAX_REMOVE_OPTIONS_PER_PAGE + 1)
    const select = getSelect(buildWishlistRemoveMessage(items, 99))
    expect(select.options[0].label).toBe(`Game ${MAX_REMOVE_OPTIONS_PER_PAGE}`)
  })

  it('keeps the select custom_id constant across pages', () => {
    const items = buildItems(MAX_REMOVE_OPTIONS_PER_PAGE + 1)
    const select = getSelect(buildWishlistRemoveMessage(items, 1))
    expect(select.custom_id).toBe('wishlist_remove_select')
  })

  it('uses a custom content string when provided', () => {
    const result = buildWishlistRemoveMessage(
      buildItems(1),
      0,
      'Custom message:'
    )
    expect(result.content).toBe('Custom message:')
  })
})
