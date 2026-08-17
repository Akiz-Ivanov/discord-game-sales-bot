import {
  InteractionResponseType,
  ComponentType,
  TextInputStyle,
  ButtonStyle,
  MessageFlags,
} from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getWishlist } from '@/services/wishlist'
import { getWishlistPrices } from '@/services/prices'
import { buildWishlistListMessage } from '@/discord/views/wishlistList'
import { getSortedFreeGames } from '@/services/freeGames'
import { buildFreeGamesMessage } from '@/discord/views/freeGames'
import { buildHelpMessage } from '../views/help'
import { buildFeedbackModal } from '../interactions/buildFeedbackModal'

export const handleWelcomeAddGame: ComponentHandler = () => ({
  type: InteractionResponseType.Modal,
  data: {
    custom_id: 'welcome_add_modal',
    title: 'Add a game to your wishlist',
    components: [
      {
        type: ComponentType.Label,
        label: 'Game title',
        component: {
          type: ComponentType.TextInput,
          custom_id: 'welcome_add_query',
          style: TextInputStyle.Short,
          required: true,
        },
      },
    ],
  },
})

export const handleWelcomeMyWishlist: ComponentHandler = async (
  interaction
) => {
  const discordId = getInteractionUserId(interaction)
  const items = await getWishlist(discordId)

  if (items.length === 0) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content:
          "Your wishlist is empty, add a game and I'll notify you when it's on sale.",
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                style: ButtonStyle.Success,
                custom_id: 'welcome_add_game',
                label: 'Add a game',
              },
            ],
          },
        ],
      },
    }
  }

  const prices = await getWishlistPrices(
    items.map((i) => ({ gameDbId: i.game.id, itadId: i.game.itadId }))
  )

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: buildWishlistListMessage(items, prices),
  }
}

export const handleWelcomeFreeGames: ComponentHandler = async () => {
  const giveaways = await getSortedFreeGames()
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: buildFreeGamesMessage(giveaways, 0, true),
  }
}

export const handleWelcomeCheckPrice: ComponentHandler = () => ({
  type: InteractionResponseType.Modal,
  data: {
    custom_id: 'welcome_price_modal',
    title: 'Check a price',
    components: [
      {
        type: ComponentType.Label,
        label: 'Game title',
        component: {
          type: ComponentType.TextInput,
          custom_id: 'welcome_price_query',
          style: TextInputStyle.Short,
          required: true,
        },
      },
    ],
  },
})

export const handleWelcomeHelp: ComponentHandler = () => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: buildHelpMessage(),
})

export const handleWelcomeFeedback: ComponentHandler = () => ({
  type: InteractionResponseType.Modal,
  data: buildFeedbackModal(),
})
