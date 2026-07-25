import type { ItadGame, ItadDeal } from '@/types'

export const game: ItadGame = {
  id: '018d937f-1ae9-734c-ba47-bd357cf07edd',
  slug: 'hollow-knight',
  title: 'Hollow Knight',
  type: 'game',
  mature: false,
  assets: {
    banner145:
      'https://assets.isthereanydeal.com/018d937f-1ae9-734c-ba47-bd357cf07edd/banner145.jpg?t=1776126009',
    banner300:
      'https://assets.isthereanydeal.com/018d937f-1ae9-734c-ba47-bd357cf07edd/banner300.jpg?t=1776126009',
    banner400:
      'https://assets.isthereanydeal.com/018d937f-1ae9-734c-ba47-bd357cf07edd/banner400.jpg?t=1776126009',
    banner600:
      'https://assets.isthereanydeal.com/018d937f-1ae9-734c-ba47-bd357cf07edd/banner600.jpg?t=1776126009',
    boxart:
      'https://assets.isthereanydeal.com/018d937f-1ae9-734c-ba47-bd357cf07edd/boxart.jpg?t=1776126009',
  },
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
    url: 'https://itad.link/018d9386-75a1-73f0-9fff-3ed650048d61/',
    ...overrides,
  }
}
