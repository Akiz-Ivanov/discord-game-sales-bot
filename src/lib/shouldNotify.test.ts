import { describe, it, expect } from 'vitest'
import { shouldNotify } from './shouldNotify'

describe('shouldNotify', () => {
  it('returns false when there is no discount', () => {
    expect(shouldNotify(0, 1499, null)).toBe(false)
  })

  it('returns true for a first-time discount (no prior notification)', () => {
    expect(shouldNotify(25, 1499, null)).toBe(true)
  })

  it('returns false when the price matches the last notified price', () => {
    expect(shouldNotify(25, 1499, 1499)).toBe(false)
  })

  it('returns true when the price has dropped below the last notification', () => {
    expect(shouldNotify(40, 999, 1499)).toBe(true)
  })

  it('returns false when the price has risen since the last notification (worse deal)', () => {
    expect(shouldNotify(10, 1299, 999)).toBe(false)
  })

  it('returns false when cut is 0 even if the price differs from last notified', () => {
    expect(shouldNotify(0, 999, 1499)).toBe(false)
  })
})
