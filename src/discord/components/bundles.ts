import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { resolveGame } from '@/services/games'
import { getBundlesForGame } from '@/itad/client'
import { buildBundlesMessage } from '@/discord/views/bundles'

//* custom_id: "price_bundles:{itadId}". Always a fresh ephemeral message,
//* never UpdateMessage — mirrors handleSaleAlertCheckPrice's posture:
//* the original /price embed (often public in a guild channel) must
//* never be rewritten to show what's really a private lookup result.
export const handleShowBundles: ComponentHandler = async (interaction) => {
  const itadId = interaction.data.custom_id.split(':')[1]
  const [match] = itadId ? await resolveGame(itadId) : []

  if (!match) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: "That game couldn't be found anymore.",
      },
    }
  }

  const bundles = await getBundlesForGame(match.id)

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: buildBundlesMessage(bundles, match.title),
  }
}
