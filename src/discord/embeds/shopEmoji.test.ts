import { describe, it, expect } from 'vitest'
import { getShopEmoji } from './shopEmoji'

describe('getShopEmoji', () => {
  it('returns a formatted custom emoji tag for a known shop', () => {
    expect(getShopEmoji('Steam')).toBe('<:steam:1530578986965405726> ')
  })

  it('strips spaces from multi-word shop names', () => {
    expect(getShopEmoji('Humble Store')).toBe(
      '<:humblestore:1530582729173897306> '
    )
  })

  it('returns an empty string for a shop without a mapped emoji', () => {
    expect(getShopEmoji('Fanatical')).toBe('')
  })
})
