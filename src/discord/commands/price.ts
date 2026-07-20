// src/discord/commands/price.ts
import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types/discord'
import { searchGames, lookupByAppId, getPrices } from '@/itad/client'
import type { ItadGame, ItadDeal } from '@/types/itad'

function formatMoney(amountInt: number, currency: string) {
  return `${(amountInt / 100).toFixed(2)} ${currency}`
}

function formatDealsReply(
  game: ItadGame,
  deals: ItadDeal[],
  historyLowInt?: number,
  currency?: string
) {
  if (deals.length === 0) {
    return `No store currently lists a price for **${game.title}**.`
  }

  const sorted = [...deals].sort(
    (a, b) => a.price.amountInt - b.price.amountInt
  )
  const shown = sorted.slice(0, 5)

  const lines = shown.map((d) => {
    const onSale =
      d.cut > 0
        ? ` (−${d.cut}%, was ${formatMoney(d.regular.amountInt, d.regular.currency)})`
        : ''
    return `**${d.shop.name}**: ${formatMoney(d.price.amountInt, d.price.currency)}${onSale}`
  })

  if (sorted.length > shown.length) {
    lines.push(`_+${sorted.length - shown.length} more shop(s)_`)
  }

  const historyLine =
    historyLowInt !== undefined
      ? `\nHistorical low: ${formatMoney(historyLowInt, currency ?? 'USD')}`
      : ''

  return `**${game.title}**\n${lines.join('\n')}${historyLine}`
}

export const price: CommandHandler = async (interaction) => {
  const gameOption = interaction.data.options?.find((o) => o.name === 'game')
  const query =
    gameOption && 'value' in gameOption ? String(gameOption.value) : null

  if (!query) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: 'Please provide a game to look up.' },
    }
  }

  const isSteamAppId = /^\d+$/.test(query.trim())
  const game = isSteamAppId
    ? await lookupByAppId(Number(query))
    : await searchGames(query)

  // Steam App ID: 0 or 1 result. Title search: could be several.
  const matches = Array.isArray(game) ? game : game ? [game] : []

  if (matches.length === 0) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: `Couldn't find a game matching "${query}".` },
    }
  }

  if (matches.length > 1) {
    const list = matches
      .slice(0, 5)
      .map((g) => `${g.title} — ${g.slug}`)
      .join('\n')
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Multiple games found, can you be more specific?\n${list}`,
      },
    }
  }

  const [match] = matches
  const [priceData] = await getPrices([match.id])

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: formatDealsReply(
        match,
        priceData?.deals ?? [],
        priceData?.historyLow.all?.amountInt,
        priceData?.historyLow.all?.currency
      ),
    },
  }
}
