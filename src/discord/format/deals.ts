import type { ItadGame, DealSummary } from '@/types'

export const formatMoney = (amountInt: number, currency: string) => {
  return `${(amountInt / 100).toFixed(2)} ${currency}`
}

export const formatDealsReply = (
  game: ItadGame,
  deals: DealSummary[],
  historyLowInt?: number,
  historyLowCurrency?: string
) => {
  const idLine = `\`\`\`${game.id}\`\`\``

  if (deals.length === 0) {
    return `**${game.title}**\n${idLine}\nNo store currently lists a price for this game.`
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
      ? `\nHistorical low: ${formatMoney(historyLowInt, historyLowCurrency ?? 'USD')}`
      : ''

  return `**${game.title}**\n${idLine}\n${lines.join('\n')}${historyLine}`
}
