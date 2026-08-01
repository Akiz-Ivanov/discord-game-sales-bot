import type { PriceSnapshot } from './itad'

export type AddToWishlistResult =
  | { status: 'added'; priceSnapshot: PriceSnapshot }
  | { status: 'already_exists'; priceSnapshot: PriceSnapshot }
  | { status: 'limit_reached' }

export type RemoveFromWishlistResult =
  { status: 'removed' } | { status: 'not_found' }
