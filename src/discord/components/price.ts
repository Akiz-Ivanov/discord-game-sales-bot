import { ComponentType, InteractionResponseType } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { getUserByDiscordId } from '@/repositories/users'
import {
  addGameToWishlist,
  removeGameFromWishlist,
  isGameWishlisted,
  getWishlist,
} from '@/services/wishlist'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { buildWishlistToggleButton } from '@/discord/interactions/buildWishlistToggleButton'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { buildWishlistRemoveMessage } from '@/discord/views/wishlistRemove'
import { wishlistLimitReachedWithRemoveMessage } from '@/lib/constants' // replaces wishlistLimitReachedMessage
import { buildBundlesButton } from '../interactions/buildBundlesButton'

//* custom_id: "price_select:{itadId}". The itadId is UUID-shaped, so
//* running it back through resolveGame() naturally lands on the same
//* lookupByItadId() branch a pasted-in ID would take — that's what
//* keeps the re-resolved game carrying the enrichment fields (reviews,
//* tags, etc.) instead of silently falling back to a lean result.
export const handlePriceSelect: ComponentHandler = async (interaction) => {
  const itadId = interaction.data.custom_id.split(':')[1]
  const [match] = itadId ? await resolveGame(itadId) : []

  if (!match) {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: "That game couldn't be found anymore — try `/price` again.",
        components: [],
      },
    }
  }

  const gameRow = await upsertGame(match)
  const { deals, historyLowInt, historyLowCurrency } = await getGamePrices(
    gameRow.id,
    match.id
  )
  const embed = buildPriceEmbed(match, deals, historyLowInt, historyLowCurrency)

  if (!interaction.guild_id) {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: '',
        embeds: [embed],
        components: [buildBundlesButton(match.id)],
      },
    }
  }

  const discordId = getInteractionUserId(interaction)
  const inWishlist = await isGameWishlisted(discordId, gameRow.id)

  return {
    type: InteractionResponseType.UpdateMessage,
    data: {
      content: '',
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

//* custom_id: "price_wishlist_toggle:{itadId}". Re-checks membership at
//* click time rather than trusting the button's own label — the
//* wishlist could've changed via /wishlist remove in between.
export const handlePriceWishlistToggle: ComponentHandler = async (
  interaction
) => {
  const itadId = interaction.data.custom_id.split(':')[1]
  const [match] = itadId ? await resolveGame(itadId) : []

  if (!match) {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: "That game couldn't be found anymore — try `/price` again.",
        components: [],
      },
    }
  }

  const gameRow = await upsertGame(match)
  const discordId = getInteractionUserId(interaction)
  const guildId = getInteractionGuildId(interaction)
  const wasWishlisted = await isGameWishlisted(discordId, gameRow.id)

  if (wasWishlisted) {
    const user = await getUserByDiscordId(discordId)
    await removeGameFromWishlist(user!.id, gameRow.id)
  } else {
    const result = await addGameToWishlist(discordId, guildId, match)
    if (result.status === 'limit_reached') {
      const items = await getWishlist(discordId)
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: buildWishlistRemoveMessage(
          items,
          0,
          wishlistLimitReachedWithRemoveMessage()
        ),
      }
    }
  }

  //* Reuses the embed already on this message instead of re-fetching
  //* prices — the numbers haven't changed since /price ran a moment
  //* ago
  return {
    type: InteractionResponseType.UpdateMessage,
    data: {
      embeds: interaction.message.embeds,
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            ...buildWishlistToggleButton(match.id, !wasWishlisted).components,
            ...buildBundlesButton(match.id).components,
          ],
        },
      ],
    },
  }
}
