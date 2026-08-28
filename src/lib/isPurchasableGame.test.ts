import { describe, it, expect } from 'vitest'
import { isPurchasableGame } from './isPurchasableGame'

describe('isPurchasableGame', () => {
  it('returns true for type "game"', () => {
    expect(isPurchasableGame({ type: 'game' })).toBe(true)
  })

  it('returns true for type "package" (e.g. Witcher 3 base game)', () => {
    expect(isPurchasableGame({ type: 'package' })).toBe(true)
  })

  it('returns false for type "dlc"', () => {
    expect(isPurchasableGame({ type: 'dlc' })).toBe(false)
  })

  it('returns false for type null', () => {
    expect(isPurchasableGame({ type: null })).toBe(false)
  })
})
