import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { getBundlesList } from '@/itad/client'
import { buildBundlesListMessage } from '@/discord/views/bundlesList'

export const bundlesList: CommandHandler = async () => {
  const bundles = await getBundlesList()
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: buildBundlesListMessage(bundles, 0),
  }
}
