import { ComponentType, MessageFlags, ButtonStyle } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISectionComponent,
  APISeparatorComponent,
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'
import type { games, wishlistItems } from '@/db/schema'
import type { ItadDeal } from '@/types'
import { formatMoney } from '@/lib/money'
import { getShopEmoji } from '@/discord/embeds/shopEmoji'

type WishlistItemWithGame = typeof wishlistItems.$inferSelect & {
  game: typeof games.$inferSelect
}

//* Component budget limit
export const MAX_ITEMS_PER_PAGE = 9
const ACCENT_COLOR = 0x378add
const TRASH_EMOJI = { id: '1533452777471344660', name: 'trash' }

const formatDealLine = (deal: ItadDeal | undefined): string => {
  if (!deal) return 'Price unavailable'
  const price = formatMoney(deal.price.amountInt, deal.price.currency)
  const shop = `${getShopEmoji(deal.shop.name)}${deal.shop.name}`
  return deal.cut > 0
    ? `${price} (−${deal.cut}%) · ${shop}`
    : `${price} · ${shop}`
}

//* Remove button's custom_id carries the current page alongside the
//* gameId (`wishlist_item_remove:{gameId}:{page}`) — this is what lets
//* the handler re-render the same page after removal instead of
//* bouncing the user back to page 1.
const buildItemSection = (
  item: WishlistItemWithGame,
  deal: ItadDeal | undefined,
  page: number
): APISectionComponent => ({
  type: ComponentType.Section,
  components: [
    {
      type: ComponentType.TextDisplay,
      content: `**${item.game.title}**\n-# ${formatDealLine(deal)}`,
    },
  ],
  accessory: {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    custom_id: `wishlist_item_remove:${item.game.id}:${page}`,
    emoji: TRASH_EMOJI,
  },
})

//* Plain classic ActionRow, not V2-specific — sits below the Container
//* as a sibling, same pattern Discord uses elsewhere for V2 messages
//* that still need button rows. Middle button is a disabled "N / M"
//* label, the standard trick for a page indicator inside a button row.
const buildPaginationRow = (
  page: number,
  totalPages: number
): APIActionRowComponent<APIButtonComponentWithCustomId> => ({
  type: ComponentType.ActionRow,
  components: [
    {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      custom_id: `wishlist_list_page:${page - 1}`,
      label: '◀',
      disabled: page === 0,
    },
    {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      custom_id: 'wishlist_list_page:noop',
      label: `${page + 1} / ${totalPages}`,
      disabled: true,
    },
    {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      custom_id: `wishlist_list_page:${page + 1}`,
      label: '▶',
      disabled: page === totalPages - 1,
    },
  ],
})

export const buildWishlistListMessage = (
  items: WishlistItemWithGame[],
  prices: Map<number, ItadDeal | undefined>,
  page = 0
) => {
  const totalPages = Math.max(1, Math.ceil(items.length / MAX_ITEMS_PER_PAGE))
  //* Clamped once, here — covers both a caller passing an out-of-range
  //* page directly and the "removed the last item on the last page"
  //* case, since items.length has already shrunk by the time this runs.
  const clampedPage = Math.min(Math.max(page, 0), totalPages - 1)
  const start = clampedPage * MAX_ITEMS_PER_PAGE
  const shown = items.slice(start, start + MAX_ITEMS_PER_PAGE)

  const children: (APISectionComponent | APISeparatorComponent)[] = []
  shown.forEach((item, idx) => {
    children.push(buildItemSection(item, prices.get(item.game.id), clampedPage))
    if (idx < shown.length - 1) {
      children.push({ type: ComponentType.Separator })
    }
  })

  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: ACCENT_COLOR,
    components: children,
  }

  const components: (
    | APIContainerComponent
    | APIActionRowComponent<APIButtonComponentWithCustomId>
  )[] = [container]

  //* Nav row only appears once there's something to navigate — keeps
  //* small wishlists exactly as clean as before this feature existed.
  if (totalPages > 1) {
    components.push(buildPaginationRow(clampedPage, totalPages))
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components,
  }
}
