import {
  InteractionResponseType,
  MessageFlags,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { getUserByDiscordId } from '@/repositories/users'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { buildWishlistListMessage } from '../views/wishlistList'
import { getWishlistPrices } from '@/services/prices'
import { buildWishlistRemoveMessage } from '../views/wishlistRemove'
import { buildWishlistAddResponse } from '../interactions/buildWishlistAddResponse'
import { getWishlist } from '@/services/wishlist'

const getSubcommand = (interaction: Parameters<CommandHandler>[0]) => {
  const sub = interaction.data.options?.[0]
  if (sub?.type !== ApplicationCommandOptionType.Subcommand) return null
  return sub //* TS now knows this is specifically the Subcommand variant
}

const getGameQuery = (sub: ReturnType<typeof getSubcommand>): string | null => {
  const gameOption = sub?.options?.find((o) => o.name === 'game')
  return gameOption && 'value' in gameOption
    ? String(gameOption.value).trim()
    : null
}

const handleAdd: CommandHandler = async (interaction) => {
  const query = getGameQuery(getSubcommand(interaction))
  if (!query) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: 'Please provide a game to add.',
      },
    }
  }

  const discordId = getInteractionUserId(interaction)
  const guildId = getInteractionGuildId(interaction)

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: await buildWishlistAddResponse(query, discordId, guildId, true),
  }
}

const handleList: CommandHandler = async (interaction) => {
  const discordId = getInteractionUserId(interaction)
  const items = await getWishlist(discordId)

  if (items.length === 0) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: 'Your wishlist is empty. Add a game with `/wishlist add`.',
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

const handleRemove: CommandHandler = async (interaction) => {
  const discordId = getInteractionUserId(interaction)
  const user = await getUserByDiscordId(discordId)
  const items = user ? await getWishlist(discordId) : []

  if (items.length === 0) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: 'Your wishlist is empty — nothing to remove.',
      },
    }
  }

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: buildWishlistRemoveMessage(items),
  }
}

export const wishlist: CommandHandler = (interaction) => {
  const sub = getSubcommand(interaction)
  if (!sub) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { flags: MessageFlags.Ephemeral, content: 'Unknown subcommand.' },
    }
  }
  if (sub.name === 'add') return handleAdd(interaction)
  if (sub.name === 'list') return handleList(interaction)
  if (sub.name === 'remove') return handleRemove(interaction)

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { flags: MessageFlags.Ephemeral, content: 'Unknown subcommand.' },
  }
}
