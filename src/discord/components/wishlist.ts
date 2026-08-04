import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getUserByDiscordId } from '@/repositories/users'
import {
  addGameToWishlist,
  getWishlist,
  removeGameFromWishlist,
} from '@/services/wishlist'
import { resolveGame } from '@/services/games'
import { getInteractionGuildId } from '../interactions/getInteractionGuildId'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { wishlistLimitReachedMessage } from '@/lib/constants'
import { buildWishlistListMessage } from '../views/wishlistList'
import { getWishlistPrices } from '@/services/prices'

export const handleWishlistRemoveSelect: ComponentHandler = async (
  interaction
) => {
  //* StringSelect interactions carry the chosen option(s) here — one
  //* value since this menu doesn't allow multi-select.
  const selectedGameId = Number(
    interaction.data && 'values' in interaction.data
      ? interaction.data.values[0]
      : undefined
  )

  const discordId = getInteractionUserId(interaction)
  const user = await getUserByDiscordId(discordId)

  //* Shouldn't happen in practice — you can't have opened this menu
  //* without a user row existing — but keeps the handler total rather
  //* than assuming.
  if (!user || !selectedGameId) {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        flags: MessageFlags.Ephemeral,
        content: 'Something went wrong — try `/wishlist remove` again.',
        components: [],
      },
    }
  }

  //* Grab the title before removing — the select option only round-trips
  //* `value` (the id), not the `label` shown in the menu.
  const items = await getWishlist(discordId)
  const matched = items.find((i) => i.game.id === selectedGameId)

  const result = await removeGameFromWishlist(user.id, selectedGameId)

  const content =
    result.status === 'removed'
      ? `✅ Removed **${matched?.game.title ?? 'that game'}** from your wishlist.`
      : `That game's already off your wishlist — nothing to remove.`

  return {
    type: InteractionResponseType.UpdateMessage,
    data: { flags: MessageFlags.Ephemeral, content, components: [] },
  }
}

//* custom_id: "wishlist_add_select:{itadId}" — mirrors handlePriceSelect's
//* re-resolution approach so the button flow lands on the same enriched
//* lookupByItadId() branch a direct-ID-paste input would take.
export const handleWishlistAddSelect: ComponentHandler = async (
  interaction
) => {
  const itadId = interaction.data.custom_id.split(':')[1]
  const discordId = getInteractionUserId(interaction)
  const guildId = getInteractionGuildId(interaction)
  const [match] = itadId ? await resolveGame(itadId) : []

  if (!match) {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        flags: MessageFlags.Ephemeral,
        content:
          "That game couldn't be found anymore — try `/wishlist add` again.",
        components: [],
      },
    }
  }

  const result = await addGameToWishlist(discordId, guildId, match)

  if (result.status === 'already_exists') {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        flags: MessageFlags.Ephemeral,
        content: `**${match.title}** is already on your wishlist.`,
        components: [],
      },
    }
  }

  if (result.status === 'limit_reached') {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        flags: MessageFlags.Ephemeral,
        content: wishlistLimitReachedMessage(),
        components: [],
      },
    }
  }

  return {
    type: InteractionResponseType.UpdateMessage,
    data: {
      flags: MessageFlags.Ephemeral,
      content: `✅ Added **${match.title}** to your wishlist.`,
      embeds: [
        buildPriceEmbed(
          match,
          result.priceSnapshot.deals,
          result.priceSnapshot.historyLowInt,
          result.priceSnapshot.historyLowCurrency
        ),
      ],
      components: [],
    },
  }
}

export const handleWishlistItemRemove: ComponentHandler = async (
  interaction
) => {
  const [, gameIdStr, pageStr] = interaction.data.custom_id.split(':')
  const gameId = Number(gameIdStr)
  const page = Number(pageStr ?? 0)
  const discordId = getInteractionUserId(interaction)
  const user = await getUserByDiscordId(discordId)

  if (!user || !gameId) {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        components: [
          { type: ComponentType.TextDisplay, content: 'Something went wrong.' },
        ],
      },
    }
  }

  await removeGameFromWishlist(user.id, gameId)
  const items = await getWishlist(discordId)
  const prices = await getWishlistPrices(
    items.map((i) => ({ gameDbId: i.game.id, itadId: i.game.itadId }))
  )

  return {
    type: InteractionResponseType.UpdateMessage,
    data: buildWishlistListMessage(items, prices, page),
  }
}

//* custom_id: "wishlist_list_page:{page}". Same fetch → render shape as
//* handleWishlistItemRemove, just without the remove step — clamping is
//* handled inside buildWishlistListMessage, so an out-of-range page here
//* (shouldn't happen from a live button, but defensive) just resolves to
//* the nearest valid one instead of erroring.
export const handleWishlistListPage: ComponentHandler = async (interaction) => {
  const page = Number(interaction.data.custom_id.split(':')[1])
  const discordId = getInteractionUserId(interaction)
  const items = await getWishlist(discordId)
  const prices = await getWishlistPrices(
    items.map((i) => ({ gameDbId: i.game.id, itadId: i.game.itadId }))
  )

  return {
    type: InteractionResponseType.UpdateMessage,
    data: buildWishlistListMessage(items, prices, page),
  }
}
