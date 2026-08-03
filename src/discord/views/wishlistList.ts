import { ComponentType, MessageFlags, ButtonStyle } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISectionComponent,
  APISeparatorComponent,
} from 'discord-api-types/v10'
import type { games, wishlistItems } from '@/db/schema'
import type { ItadDeal } from '@/types'
import { formatMoney } from '@/lib/money'
import { getShopEmoji } from '@/discord/embeds/shopEmoji'

type WishlistItemWithGame = typeof wishlistItems.$inferSelect & {
  game: typeof games.$inferSelect
}

//* Component budget with the merged single-TextDisplay-per-item layout:
//* Container(1) + 3/item (Section + TextDisplay + Button accessory) +
//* Separator(1)/item, minus the trailing one = 4*N + 1 ≤ 40 → N ≤ 9.
//* Held at 8 to leave headroom for the pagination row coming next.
const MAX_ITEMS_PER_PAGE = 8
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

const buildItemSection = (
  item: WishlistItemWithGame,
  deal: ItadDeal | undefined
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
    custom_id: `wishlist_item_remove:${item.game.id}`,
    emoji: TRASH_EMOJI,
  },
})

export const buildWishlistListMessage = (
  items: WishlistItemWithGame[],
  prices: Map<number, ItadDeal | undefined>
) => {
  const shown = items.slice(0, MAX_ITEMS_PER_PAGE)

  const children: (APISectionComponent | APISeparatorComponent)[] = []
  shown.forEach((item, idx) => {
    children.push(buildItemSection(item, prices.get(item.game.id)))
    if (idx < shown.length - 1) {
      children.push({ type: ComponentType.Separator })
    }
  })

  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: ACCENT_COLOR,
    components: children,
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [container],
  }
}
