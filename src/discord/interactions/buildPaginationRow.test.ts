import { describe, it, expect } from 'vitest'
import { buildPaginationRow } from './buildPaginationRow'
import { ComponentType } from 'discord-api-types/v10'

describe('buildPaginationRow', () => {
  it('builds Prev/indicator/Next buttons keyed by the given prefix', () => {
    const row = buildPaginationRow('wishlist_remove_page', 1, 3)

    expect(row.type).toBe(ComponentType.ActionRow)
    expect(row.components).toHaveLength(3)
    expect(row.components[0].custom_id).toBe('wishlist_remove_page:0')
    expect(row.components[2].custom_id).toBe('wishlist_remove_page:2')
  })

  it('shows a 1-indexed "current / total" label', () => {
    const row = buildPaginationRow('wishlist_list_page', 1, 3)
    expect(row.components[1].label).toBe('2 / 3')
    expect(row.components[1].disabled).toBe(true)
  })

  it('disables Prev on the first page', () => {
    const row = buildPaginationRow('wishlist_list_page', 0, 3)
    expect(row.components[0].disabled).toBe(true)
    expect(row.components[2].disabled).toBe(false)
  })

  it('disables Next on the last page', () => {
    const row = buildPaginationRow('wishlist_list_page', 2, 3)
    expect(row.components[0].disabled).toBe(false)
    expect(row.components[2].disabled).toBe(true)
  })
})
