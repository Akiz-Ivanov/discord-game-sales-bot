import { describe, it, expect } from 'vitest'
import { clampPage, getTotalPages } from './paginate'

describe('getTotalPages', () => {
  it('returns 1 for an empty list', () => {
    expect(getTotalPages(0, 10)).toBe(1)
  })

  it('returns 1 when everything fits on one page', () => {
    expect(getTotalPages(9, 10)).toBe(1)
  })

  it('rounds up when items overflow one page', () => {
    expect(getTotalPages(11, 10)).toBe(2)
  })
})

describe('clampPage', () => {
  it('leaves an in-range page untouched', () => {
    expect(clampPage(1, 3)).toBe(1)
  })

  it('clamps a negative page up to 0', () => {
    expect(clampPage(-5, 3)).toBe(0)
  })

  it('clamps an above-range page down to the last page', () => {
    expect(clampPage(99, 3)).toBe(2)
  })
})
