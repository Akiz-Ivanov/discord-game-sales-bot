import type { ComponentHandler } from '@/types'
import { handleWishlistAddSelect, handleWishlistRemoveSelect } from './wishlist'
import { handlePriceSelect } from './price'

//* Keyed by the literal prefix before the first ':' in custom_id.
//* e.g. custom_id "wishlist_remove_select" or "wishlist_remove_page:2"
//* both route on the "wishlist_remove_select"/"wishlist_remove_page" key.
export const components: Record<string, ComponentHandler> = {
  wishlist_remove_select: handleWishlistRemoveSelect,
  wishlist_add_select: handleWishlistAddSelect,
  price_select: handlePriceSelect,
}
