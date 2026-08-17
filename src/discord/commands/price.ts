import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { buildPriceLookupResponse } from '@/discord/interactions/buildPriceLookupResponse'

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

  const discordId = interaction.guild_id
    ? getInteractionUserId(interaction)
    : undefined

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: await buildPriceLookupResponse(
      query,
      discordId,
      interaction.guild_id,
      false
    ),
  }
}
