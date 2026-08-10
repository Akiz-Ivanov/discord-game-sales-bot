import { describe, it, expect } from 'vitest'
import { buildWishlistToggleButton } from './buildWishlistToggleButton'
import { ButtonStyle } from 'discord-api-types/v10'

describe('buildWishlistToggleButton', () => {
  it('builds an Add button with Primary style when the game is not wishlisted', () => {
    const row = buildWishlistToggleButton('itad-1', false)
    expect(row.components[0]).toMatchObject({
      style: ButtonStyle.Primary,
      label: '➕ Add to wishlist',
    })
  })

  it('builds a Remove button with Secondary style when the game is already wishlisted', () => {
    const row = buildWishlistToggleButton('itad-1', true)
    expect(row.components[0]).toMatchObject({
      style: ButtonStyle.Secondary,
      label: '➖ Remove from wishlist',
    })
  })
})
