import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types/discord'

export const price: CommandHandler = async (interaction) => {
  const game = interaction.data.options?.find((o) => o.name === 'game')

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `(stub) You asked for the price of: ${
        game && 'value' in game ? game.value : 'unknown'
      }`,
    },
  }
}
