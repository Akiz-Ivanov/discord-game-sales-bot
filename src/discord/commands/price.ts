import { ComponentType, InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { buildGameSelectButtons } from '@/discord/interactions/buildGameSelectButtons'
import { getInteractionUserId } from '../interactions/getInteractionUserId'
import { isGameWishlisted } from '@/services/wishlist'
import { buildWishlistToggleButton } from '../interactions/buildWishlistToggleButton'
import { buildBundlesButton } from '../interactions/buildBundlesButton'

export const price: CommandHandler = async (interaction) => {
  const gameOption = interaction.data.options?.find((o) => o.name === 'game')
  const query =
    gameOption && 'value' in gameOption ? String(gameOption.value).trim() : null

  if (!query) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: 'Please provide a game to look up.' },
    }
  }

  const matches = await resolveGame(query)

  if (matches.length === 0) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: `Couldn't find a game matching "${query}".` },
    }
  }

  if (matches.length > 1) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'Multiple games found — pick one:',
        components: [buildGameSelectButtons(matches, 'price_select')],
      },
    }
  }

  const [match] = matches
  const gameRow = await upsertGame(match)
  const { deals, historyLowInt, historyLowCurrency } = await getGamePrices(
    gameRow.id,
    match.id
  )

  const embed = buildPriceEmbed(match, deals, historyLowInt, historyLowCurrency)

  //* No guild context (DM) → wishlist add/remove would throw on click
  //* (getInteractionGuildId), so don't offer a button that can't work.
  if (!interaction.guild_id) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { embeds: [embed], components: [buildBundlesButton(match.id)] },
    }
  }

  const discordId = getInteractionUserId(interaction)
  const inWishlist = await isGameWishlisted(discordId, gameRow.id)

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
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
    },
  }
}
