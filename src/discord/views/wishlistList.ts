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
import { buildPaginationRow } from '@/discord/interactions/buildPaginationRow'
import { clampPage, getTotalPages } from '@/lib/paginate'

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

//* Free games sort to the top
const sortByDiscount = (
  items: WishlistItemWithGame[],
  prices: Map<number, ItadDeal | undefined>
): WishlistItemWithGame[] =>
  [...items].sort(
    (a, b) =>
      (prices.get(b.game.id)?.cut ?? -1) - (prices.get(a.game.id)?.cut ?? -1)
  )

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

export const buildWishlistListMessage = (
  items: WishlistItemWithGame[],
  prices: Map<number, ItadDeal | undefined>,
  page = 0
) => {
  if (items.length === 0) {
    const container: APIContainerComponent = {
      type: ComponentType.Container,
      accent_color: ACCENT_COLOR,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: 'Your wishlist is empty. Add a game with `/wishlist add`.',
        },
      ],
    }
    return {
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      components: [container],
    }
  }

  const sorted = sortByDiscount(items, prices)
  const totalPages = getTotalPages(sorted.length, MAX_ITEMS_PER_PAGE)
  const clampedPage = clampPage(page, totalPages)
  const start = clampedPage * MAX_ITEMS_PER_PAGE
  const shown = sorted.slice(start, start + MAX_ITEMS_PER_PAGE)

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
    components.push(
      buildPaginationRow('wishlist_list_page', clampedPage, totalPages)
    )
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components,
  }
}
