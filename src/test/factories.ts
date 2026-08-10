import type { ItadGame, ItadDeal, GamerPowerGiveaway } from '@/types'
import type { games, wishlistItems } from '@/db/schema'

export const buildComponentInteraction = <
  T extends (...args: never[]) => unknown,
>(
  customId: string,
  overrides: Record<string, unknown> = {}
) =>
  ({
    ...overrides,
    data: { custom_id: customId, ...(overrides.data as object | undefined) },
  }) as unknown as Parameters<T>[0]

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

export const makeGameRow = (
  overrides: Partial<typeof games.$inferSelect> = {}
): typeof games.$inferSelect => ({
  id: 1,
  itadId: game.id,
  slug: game.slug,
  title: game.title,
  steamAppId: null,
  historyLowAmount: null,
  historyLowCurrency: null,
  createdAt: new Date(),
  ...overrides,
})

export const makeWishlistItemRow = (
  overrides: Partial<
    Omit<typeof wishlistItems.$inferSelect, 'id' | 'userId' | 'gameId'>
  > & {
    id?: number
    userId?: number
    gameId?: number
    game?: ReturnType<typeof makeGameRow>
  } = {}
) => ({
  id: 1,
  userId: 1,
  gameId: 1,
  lastNotifiedPrice: null,
  createdAt: new Date(),
  game: makeGameRow(),
  ...overrides,
})

export const makeGiveaway = (
  overrides: Partial<GamerPowerGiveaway> = {}
): GamerPowerGiveaway => ({
  id: 1,
  title: 'Moonlighter',
  worth: '$19.99',
  thumbnail: '',
  image: '',
  description: '',
  instructions: '',
  open_giveaway_url:
    'https://www.gamerpower.com/open/moonlighter-steam-giveawaway',
  published_date: '2026-08-05 14:23:24',
  type: 'Game',
  platforms: 'PC, Steam',
  end_date: '2026-08-09 23:59:00',
  users: 21630,
  status: 'Active',
  gamerpower_url: 'https://www.gamerpower.com/moonlighter-steam-giveawaway',
  open_giveaway: 'https://www.gamerpower.com/open/moonlighter-steam-giveawaway',
  ...overrides,
})
