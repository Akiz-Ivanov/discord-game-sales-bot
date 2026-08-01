import { describe, it, expect } from 'vitest'
import { pickCheapestDeal } from './pickCheapestDeal'
import { makeDeal } from '@/test/factories'

describe('pickCheapestDeal', () => {
  it('returns undefined for an empty array', () => {
    expect(pickCheapestDeal([])).toBeUndefined()
  })

  it('returns the only deal when there is just one', () => {
    const deal = makeDeal()
    expect(pickCheapestDeal([deal])).toEqual(deal)
  })

  it('picks the deal with the lowest amountInt regardless of input order', () => {
    const cheap = makeDeal({
      price: { amount: 6.99, amountInt: 699, currency: 'USD' },
    })
    const expensive = makeDeal({
      price: { amount: 8.99, amountInt: 899, currency: 'USD' },
    })
    expect(pickCheapestDeal([expensive, cheap])).toEqual(cheap)
  })

  it('does not mutate the input array', () => {
    const deals = [
      makeDeal({ price: { amount: 8.99, amountInt: 899, currency: 'USD' } }),
      makeDeal({ price: { amount: 6.99, amountInt: 699, currency: 'USD' } }),
    ]
    const original = [...deals]
    pickCheapestDeal(deals)
    expect(deals).toEqual(original)
  })
})
