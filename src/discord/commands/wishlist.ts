import {
  InteractionResponseType,
  MessageFlags,
  ComponentType,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { resolveGame } from '@/services/games'
import { addGameToWishlist, getWishlist } from '@/services/wishlist'
import { getUserByDiscordId } from '@/repositories/users'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { buildGameSelectButtons } from '../interactions/buildGameSelectButtons'
import { getInteractionGuildId } from '../interactions/getInteractionGuildId'

const MAX_SELECT_OPTIONS = 25

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

  const matches = await resolveGame(query)

  if (matches.length === 0) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: `Couldn't find a game matching "${query}".`,
      },
    }
  }

  if (matches.length > 1) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: 'Multiple games found — pick one:',
        components: [buildGameSelectButtons(matches, 'wishlist_add_select')],
      },
    }
  }

  const discordId = getInteractionUserId(interaction)
  const guildId = getInteractionGuildId(interaction)
  const [match] = matches
  const result = await addGameToWishlist(discordId, guildId, match)

  const content =
    result.status === 'added'
      ? `✅ Added **${match.title}** to your wishlist.`
      : `**${match.title}** is already on your wishlist.`

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { flags: MessageFlags.Ephemeral, content },
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

  const list = items.map((i, idx) => `${idx + 1}. ${i.game.title}`).join('\n')

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: `**Your Wishlist**\n${list}`,
    },
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

  //* MVP: first 25 only. Wishlists beyond that need pagination (TODO),
  //* not built yet since no real user is near this limit.
  const options = items.slice(0, MAX_SELECT_OPTIONS).map((i) => ({
    label: i.game.title.slice(0, 100), // Discord's own option-label cap
    value: String(i.game.id),
  }))

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: 'Select a game to remove:',
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.StringSelect,
              custom_id: 'wishlist_remove_select',
              options,
            },
          ],
        },
      ],
    },
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
