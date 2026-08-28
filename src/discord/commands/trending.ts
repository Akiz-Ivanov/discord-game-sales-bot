import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { getTrendingDeals } from '@/itad/client'
import { buildTrendingMessage } from '@/discord/views/trending'

export const trending: CommandHandler = async () => {
  const deals = await getTrendingDeals()
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: buildTrendingMessage(deals, 0),
  }
}
