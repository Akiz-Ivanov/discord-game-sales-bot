import type { ComponentHandler } from '@/types'
import {
  handleWishlistAddSelect,
  handleWishlistRemoveSelect,
  handleWishlistItemRemove,
  handleWishlistListPage,
  handleWishlistRemovePage,
} from './wishlist'
import { handlePriceSelect, handlePriceWishlistToggle } from './price'
import { handleSaleAlertCheckPrice } from './saleAlert'
import { handleFreeGamesPage, handleFreeGamesPageRich } from './freeGames'
import { handleShowBundles } from './bundles'
import { handleForgetMeConfirm, handleForgetMeCancel } from './forgetMe'
import { handleRemoveAlertsConfirm, handleRemoveAlertsCancel } from './config'

//* Keyed by the literal prefix before the first ':' in custom_id.
//* e.g. custom_id "wishlist_remove_select" or "wishlist_remove_page:2"
//* both route on the "wishlist_remove_select"/"wishlist_remove_page" key.
export const components: Record<string, ComponentHandler> = {
  wishlist_remove_select: handleWishlistRemoveSelect,
  wishlist_add_select: handleWishlistAddSelect,
  wishlist_item_remove: handleWishlistItemRemove,
  wishlist_list_page: handleWishlistListPage,
  wishlist_remove_page: handleWishlistRemovePage,
  price_select: handlePriceSelect,
  sale_check_price: handleSaleAlertCheckPrice,
  price_wishlist_toggle: handlePriceWishlistToggle,
  free_games_page: handleFreeGamesPage,
  free_games_page_rich: handleFreeGamesPageRich,
  price_bundles: handleShowBundles,
  forget_me_confirm: handleForgetMeConfirm,
  forget_me_cancel: handleForgetMeCancel,
  config_remove_alerts_confirm: handleRemoveAlertsConfirm,
  config_remove_alerts_cancel: handleRemoveAlertsCancel,
}
