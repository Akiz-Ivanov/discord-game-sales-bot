import { MessageFlags } from 'discord-api-types/v10'
import type { APIInteractionResponseCallbackData } from 'discord-api-types/v10'
import { resolveGame } from '@/services/games'
import { addGameToWishlist, getWishlist } from '@/services/wishlist'
import { buildGameSelectButtons } from './buildGameSelectButtons'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { buildWishlistRemoveMessage } from '@/discord/views/wishlistRemove'
import { wishlistLimitReachedWithRemoveMessage } from '@/lib/constants'

//* Shared by /wishlist add and the welcome card's add-game modal — both
//* need "resolve → single/multi branch → addGameToWishlist → status
//* branch," and duplicating that risks the already-exists/limit-reached/
//* added logic drifting apart between the two call sites.
export const buildWishlistAddResponse = async (
  query: string,
  discordId: string,
  guildId: string,
  ephemeral: boolean
): Promise<APIInteractionResponseCallbackData> => {
  const matches = await resolveGame(query)
  const flags = ephemeral ? MessageFlags.Ephemeral : undefined

  if (matches.length === 0) {
    return { flags, content: `Couldn't find a game matching "${query}".` }
  }

  if (matches.length > 1) {
    return {
      flags,
      content: 'Multiple games found — pick one:',
      components: [buildGameSelectButtons(matches, 'wishlist_add_select')],
    }
  }

  const [match] = matches
  const result = await addGameToWishlist(discordId, guildId, match)

  if (result.status === 'already_exists') {
    return { flags, content: `**${match.title}** is already on your wishlist.` }
  }

  if (result.status === 'limit_reached') {
    const items = await getWishlist(discordId)
    return buildWishlistRemoveMessage(
      items,
      0,
      wishlistLimitReachedWithRemoveMessage()
    )
  }

  return {
    flags,
    content: `✅ Added **${match.title}** to your wishlist.`,
    embeds: [
      buildPriceEmbed(
        match,
        result.priceSnapshot.deals,
        result.priceSnapshot.historyLowInt,
        result.priceSnapshot.historyLowCurrency
      ),
    ],
  }
}
