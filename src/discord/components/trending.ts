import { InteractionResponseType } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { getTrendingDeals } from '@/itad/client'
import { buildTrendingMessage } from '@/discord/views/trending'

//* custom_id: "trending_page:{page}". Live-refetches on every click, same
//* posture as free games — trending shifts slowly, but a stale multi-page
//* browse from an old snapshot risks pointing at a deal that's since
//* expired more than the extra ITAD call costs.
export const handleTrendingPage: ComponentHandler = async (interaction) => {
  const page = Number(interaction.data.custom_id.split(':')[1])
  const deals = await getTrendingDeals()
  return {
    type: InteractionResponseType.UpdateMessage,
    data: buildTrendingMessage(deals, page),
  }
}
