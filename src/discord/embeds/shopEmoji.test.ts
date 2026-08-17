import { describe, it, expect } from 'vitest'
import { getShopEmoji } from './shopEmoji'

describe('getShopEmoji', () => {
  it('returns a formatted custom emoji tag for a known shop', () => {
    expect(getShopEmoji('Steam')).toBe('<:steam:1530578986965405726> ')
  })

  it('strips spaces from multi-word shop names', () => {
    expect(getShopEmoji('Humble Store')).toBe(
      '<:humblestore:1538946695029850313> '
    )
  })

  it('returns a formatted custom emoji tag for Fanatical', () => {
    expect(getShopEmoji('Fanatical')).toBe('<:fanatical:1538944690303406080> ')
  })

  it('returns an empty string for a shop without a mapped emoji', () => {
    expect(getShopEmoji('Green Man Gaming')).toBe('')
  })
})
