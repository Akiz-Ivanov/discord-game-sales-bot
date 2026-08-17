import { InteractionResponseType } from 'discord-api-types/v10'
import type { ModalHandler } from '@/types'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { buildPriceLookupResponse } from '@/discord/interactions/buildPriceLookupResponse'
import { findLabelTextInputValue } from '@/discord/modals/shared'

export const handleWelcomePriceModalSubmit: ModalHandler = async (
  interaction
) => {
  const query = findLabelTextInputValue(
    interaction.data.components,
    'welcome_price_query'
  )?.trim()

  if (!query) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { flags: 64, content: 'Please enter a game to look up.' },
    }
  }

  const discordId = getInteractionUserId(interaction)
  const guildId = getInteractionGuildId(interaction) //* always present — this modal only exists on a card posted via /config, which is guild-only

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: await buildPriceLookupResponse(query, discordId, guildId, true),
  }
}
