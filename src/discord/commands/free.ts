import { getSortedFreeGames } from '@/services/freeGames'
import { buildFreeGamesMessage } from '@/discord/views/freeGames'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'

export const free: CommandHandler = async () => {
  const giveaways = await getSortedFreeGames()
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: buildFreeGamesMessage(giveaways, 0, true), // rich = true, thumbnails on
  }
}
