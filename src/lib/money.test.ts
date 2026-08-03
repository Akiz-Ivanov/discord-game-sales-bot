import { describe, it, expect } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('formats integer cents as a currency string', () => {
    expect(formatMoney(1499, 'USD')).toBe('$14.99')
  })

  it('handles zero correctly', () => {
    expect(formatMoney(0, 'USD')).toBe('Free')
  })
})
