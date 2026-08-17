import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { ModalHandler } from '@/types'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { buildWishlistAddResponse } from '@/discord/interactions/buildWishlistAddResponse'
import { findLabelTextInputValue } from './shared'

export const handleWelcomeAddGameModalSubmit: ModalHandler = async (
  interaction
) => {
  const query = findLabelTextInputValue(
    interaction.data.components,
    'welcome_add_query'
  )

  if (!query) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: 'Please enter a game to add.',
      },
    }
  }

  const discordId = getInteractionUserId(interaction)
  const guildId = getInteractionGuildId(interaction) //* same guarantee as welcomePrice.ts — this modal only ever opens from the welcome card, which is guild-only

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: await buildWishlistAddResponse(query, discordId, guildId, true),
  }
}
