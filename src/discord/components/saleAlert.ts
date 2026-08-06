import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'

//* custom_id: "sale_check_price:{itadId}". Unlike price_select/
//* wishlist_add_select, this ALWAYS posts a brand-new ephemeral message
//* rather than UpdateMessage — the alert card is shared by everyone in
//* the channel, so overwriting it to show one person's lookup would
//* erase the alert for everyone else. A fresh ephemeral reply is the
//* only response shape that's private to the clicker without touching
//* the original message.
export const handleSaleAlertCheckPrice: ComponentHandler = async (
  interaction
) => {
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

  const gameRow = await upsertGame(match)
  const { deals, historyLowInt, historyLowCurrency } = await getGamePrices(
    gameRow.id,
    match.id
  )

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      embeds: [
        buildPriceEmbed(match, deals, historyLowInt, historyLowCurrency),
      ],
    },
  }
}
