import { InteractionResponseType } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'

//* custom_id: "price_select:{itadId}". The itadId is UUID-shaped, so
//* running it back through resolveGame() naturally lands on the same
//* lookupByItadId() branch a pasted-in ID would take — that's what
//* keeps the re-resolved game carrying the enrichment fields (reviews,
//* tags, etc.) instead of silently falling back to a lean result.
export const handlePriceSelect: ComponentHandler = async (interaction) => {
  const itadId = interaction.data.custom_id.split(':')[1]
  const [match] = itadId ? await resolveGame(itadId) : []

  if (!match) {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: "That game couldn't be found anymore — try `/price` again.",
        components: [],
      },
    }
  }

  const gameRow = await upsertGame(match)
  const { deals, historyLowInt, historyLowCurrency } = await getGamePrices(
    gameRow.id,
    match.id
  )

  return {
    type: InteractionResponseType.UpdateMessage,
    data: {
      content: '',
      embeds: [
        buildPriceEmbed(match, deals, historyLowInt, historyLowCurrency),
      ],
      components: [],
    },
  }
}
