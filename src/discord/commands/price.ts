import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { formatDealsReply } from '@/discord/format/deals'

export const price: CommandHandler = async (interaction) => {
  const gameOption = interaction.data.options?.find((o) => o.name === 'game')
  const query =
    gameOption && 'value' in gameOption ? String(gameOption.value).trim() : null

  if (!query) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: 'Please provide a game to look up.' },
    }
  }

  const matches = await resolveGame(query)

  if (matches.length === 0) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: `Couldn't find a game matching "${query}".` },
    }
  }

  if (matches.length > 1) {
    const list = matches
      .slice(0, 5)
      .map((g) => `${g.title} — \`${g.id}\``)
      .join('\n')
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Multiple games found, can you please be more specific?\n${list}`,
      },
    }
  }

  const [match] = matches
  const gameRow = await upsertGame(match)
  const { deals, historyLowInt, historyLowCurrency } = await getGamePrices(
    gameRow.id,
    match.id
  )

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: formatDealsReply(
        match,
        deals,
        historyLowInt,
        historyLowCurrency
      ),
    },
  }
}
