import type { ItadGame, ItadDeal } from '@/types'

export const game: ItadGame = {
  id: '018d937f-1ae9-734c-ba47-bd357cf07edd',
  slug: 'hollow-knight',
  title: 'Hollow Knight',
  type: 'game',
  mature: false,
  assets: {},
}

export const makeDeal = (overrides: Partial<ItadDeal> = {}): ItadDeal => {
  return {
    shop: { id: 61, name: 'Steam' },
    price: { amount: 14.99, amountInt: 1499, currency: 'USD' },
    regular: { amount: 14.99, amountInt: 1499, currency: 'USD' },
    cut: 0,
    voucher: null,
    storeLow: null,
    flag: null,
    drm: [],
    platforms: [],
    timestamp: '2026-07-09T19:23:15+02:00',
    expiry: null,
    url: 'https://itad.link/example/',
    ...overrides,
  }
}
