import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type { APIInteractionResponseCallbackData } from 'discord-api-types/v10'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { buildGameSelectButtons } from './buildGameSelectButtons'
import { isGameWishlisted } from '@/services/wishlist'
import { buildWishlistToggleButton } from './buildWishlistToggleButton'
import { buildBundlesButton } from './buildBundlesButton'

//* Shared by /price and the welcome card's price-check modal — both need
//* "resolve → single/multi branch → embed + toggle/bundles buttons,"
export const buildPriceLookupResponse = async (
  query: string,
  discordId: string | undefined,
  guildId: string | undefined,
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
      components: [buildGameSelectButtons(matches, 'price_select')],
    }
  }

  const match = matches[0]!
  const gameRow = await upsertGame(match)
  const { deals, historyLowInt, historyLowCurrency } = await getGamePrices(
    gameRow.id,
    match.id
  )
  const embed = buildPriceEmbed(match, deals, historyLowInt, historyLowCurrency)

  if (!guildId || !discordId) {
    return {
      flags,
      embeds: [embed],
      components: [buildBundlesButton(match.id)],
    }
  }

  const inWishlist = await isGameWishlisted(discordId, gameRow.id)

  return {
    flags,
    embeds: [embed],
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          ...buildWishlistToggleButton(match.id, inWishlist).components,
          ...buildBundlesButton(match.id).components,
        ],
      },
    ],
  }
}
