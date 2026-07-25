import { describe, it, expect } from 'vitest'
import { getDiscountEmoji } from './discountEmoji'

describe('getDiscountEmoji', () => {
  it('returns nothing when there is no discount', () => {
    expect(getDiscountEmoji(0)).toBe('')
  })

  it('returns the single-caret icon for a small discount', () => {
    expect(getDiscountEmoji(15)).toBe('<:caretcircledown:1530576295199768637> ')
  })

  it('returns the double-caret icon at the big-discount threshold', () => {
    expect(getDiscountEmoji(50)).toBe(
      '<:caretcircledoubledownfill1:1530575294711337120> '
    )
  })

  it('returns the double-caret icon for a large discount', () => {
    expect(getDiscountEmoji(80)).toBe(
      '<:caretcircledoubledownfill1:1530575294711337120> '
    )
  })
})
