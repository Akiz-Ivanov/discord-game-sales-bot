export type AddToWishlistResult =
  { status: 'added' } | { status: 'already_exists' }

export type RemoveFromWishlistResult =
  { status: 'removed' } | { status: 'not_found' }
