import { InteractionResponseType } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { getBundlesList } from '@/itad/client'
import { buildBundlesListMessage } from '@/discord/views/bundlesList'

//* custom_id: "bundles_page:{page}". Live-refetches on every click, same
//* posture as /trending and free games — a paged browse list favors
//* freshness over caching the initial fetch.
export const handleBundlesListPage: ComponentHandler = async (interaction) => {
  const page = Number(interaction.data.custom_id.split(':')[1])
  const bundles = await getBundlesList()
  return {
    type: InteractionResponseType.UpdateMessage,
    data: buildBundlesListMessage(bundles, page),
  }
}
