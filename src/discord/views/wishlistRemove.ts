import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
  APIStringSelectComponent,
} from 'discord-api-types/v10'
import type { games, wishlistItems } from '@/db/schema'
import { buildPaginationRow } from '@/discord/interactions/buildPaginationRow'
import { clampPage, getTotalPages } from '@/lib/paginate'

type WishlistItemWithGame = typeof wishlistItems.$inferSelect & {
  game: typeof games.$inferSelect
}

//* Discord's StringSelect option cap.
export const MAX_REMOVE_OPTIONS_PER_PAGE = 25

export const buildWishlistRemoveMessage = (
  items: WishlistItemWithGame[],
  page = 0,
  content?: string
) => {
  const totalPages = getTotalPages(items.length, MAX_REMOVE_OPTIONS_PER_PAGE)
  const clampedPage = clampPage(page, totalPages)
  const start = clampedPage * MAX_REMOVE_OPTIONS_PER_PAGE
  const shown = items.slice(start, start + MAX_REMOVE_OPTIONS_PER_PAGE)
  const end = start + shown.length

  const select: APIStringSelectComponent = {
    type: ComponentType.StringSelect,
    custom_id: 'wishlist_remove_select',
    options: shown.map((i) => ({
      label: i.game.title.slice(0, 100), // Discord's own option-label cap
      value: String(i.game.id),
    })),
  }

  const components: (
    | APIActionRowComponent<APIStringSelectComponent>
    | APIActionRowComponent<APIButtonComponentWithCustomId>
  )[] = [{ type: ComponentType.ActionRow, components: [select] }]

  if (totalPages > 1) {
    components.push(
      buildPaginationRow('wishlist_remove_page', clampedPage, totalPages)
    )
  }

  const defaultContent =
    totalPages > 1
      ? `Select a game to remove (${start + 1}–${end} of ${items.length}):`
      : 'Select a game to remove:'

  return {
    flags: MessageFlags.Ephemeral,
    content: content ?? defaultContent,
    components,
  }
}
