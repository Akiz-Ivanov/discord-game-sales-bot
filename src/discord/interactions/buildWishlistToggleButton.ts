import { ButtonStyle, ComponentType } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'

//* Single-button row on /price's embed. custom_id only carries the itadId
//* — the handler re-checks membership at click time rather than trusting
//* the label, since the wishlist could've changed via a different
//* command between render and click.
export const buildWishlistToggleButton = (
  itadId: string,
  inWishlist: boolean
): APIActionRowComponent<APIButtonComponentWithCustomId> => ({
  type: ComponentType.ActionRow,
  components: [
    {
      type: ComponentType.Button,
      style: inWishlist ? ButtonStyle.Secondary : ButtonStyle.Success,
      custom_id: `price_wishlist_toggle:${itadId}`,
      label: inWishlist ? '➖ Remove from wishlist' : '➕ Add to wishlist',
    },
  ],
})
