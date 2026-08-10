import { InteractionResponseType } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { getSortedFreeGames } from '@/services/freeGames'
import { buildFreeGamesMessage } from '@/discord/views/freeGames'

//* custom_id: "free_games_page:{page}". Live-refetches from GamerPower on
//* every click rather than caching the original list — cheap (no auth,
//* 10 req/sec limit) and means Prev/Next always reflects genuinely
//* current giveaways, not a stale snapshot from whenever the cron fired.
export const handleFreeGamesPage: ComponentHandler = async (interaction) => {
  const page = Number(interaction.data.custom_id.split(':')[1])
  const giveaways = await getSortedFreeGames()
  return {
    type: InteractionResponseType.UpdateMessage,
    data: buildFreeGamesMessage(giveaways, page),
  }
}

export const handleFreeGamesPageRich: ComponentHandler = async (
  interaction
) => {
  const page = Number(interaction.data.custom_id.split(':')[1])
  const giveaways = await getSortedFreeGames()
  return {
    type: InteractionResponseType.UpdateMessage,
    data: buildFreeGamesMessage(giveaways, page, true),
  }
}
