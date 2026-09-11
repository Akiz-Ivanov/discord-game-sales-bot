import { describe, it, expect } from 'vitest'
import { buildWishlistToggleButton } from './buildWishlistToggleButton'
import { ButtonStyle } from 'discord-api-types/v10'

describe('buildWishlistToggleButton', () => {
  it('builds an Add button with Success style and the plus-circle emoji when the game is not wishlisted', () => {
    const row = buildWishlistToggleButton('itad-1', false)
    expect(row.components[0]).toMatchObject({
      style: ButtonStyle.Success,
      label: 'Add to wishlist',
      emoji: { id: '1547931440811876434', name: 'pluscirclefill1' },
    })
  })

  it('builds a Remove button with Secondary style and the minus-circle emoji when the game is already wishlisted', () => {
    const row = buildWishlistToggleButton('itad-1', true)
    expect(row.components[0]).toMatchObject({
      style: ButtonStyle.Secondary,
      label: 'Remove from wishlist',
      emoji: { id: '1547926670600573038', name: 'minuscirclefill1' },
    })
  })
})
