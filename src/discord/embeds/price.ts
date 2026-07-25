import type { APIEmbed, APIEmbedField } from 'discord-api-types/v10'
import type { ItadGame, DealSummary } from '@/types'
import { formatMoney } from '@/lib/money'
import { getShopEmoji } from './shopEmoji'
import { getDiscountEmoji } from './discountEmoji'
import { customEmojiTag } from './discordEmoji'

const EMBED_COLOR_ON_SALE = 0x57f287
const EMBED_COLOR_NO_SALE = 0x5865f2
const EMBED_COLOR_NO_DEALS = 0x99aab5

const MAX_SHOPS_SHOWN = 5

const pickEmbedColor = (deals: DealSummary[]) => {
  if (deals.length === 0) return EMBED_COLOR_NO_DEALS
  return deals.some((d) => d.cut > 0)
    ? EMBED_COLOR_ON_SALE
    : EMBED_COLOR_NO_SALE
}

const CHART_LINE_DOWN_ID = '1530575847679856821'

const buildDealField = (deal: DealSummary): APIEmbedField => {
  const price = formatMoney(deal.price.amountInt, deal.price.currency)
  const priceLine =
    deal.cut > 0
      ? `${getDiscountEmoji(deal.cut)}${price} (−${deal.cut}%, was ${formatMoney(deal.regular.amountInt, deal.regular.currency)})`
      : price

  return {
    name: `${getShopEmoji(deal.shop.name)} ${deal.shop.name}`,
    value: `> [${priceLine}](${deal.url})`,
    inline: false,
  }
}

const buildHistoryLowField = (
  historyLowInt?: number,
  historyLowCurrency?: string
): APIEmbedField | null => {
  if (historyLowInt === undefined) return null
  return {
    name: `${customEmojiTag('chartlinedown', CHART_LINE_DOWN_ID)} Historical low`,
    value: formatMoney(historyLowInt, historyLowCurrency ?? 'USD'),
    inline: false,
  }
}

const buildIdField = (id: string): APIEmbedField => ({
  name: 'ITAD ID',
  value: `\`${id}\``,
  inline: false,
})

export const buildPriceEmbed = (
  game: ItadGame,
  deals: DealSummary[],
  historyLowInt?: number,
  historyLowCurrency?: string
): APIEmbed => {
  const color = pickEmbedColor(deals)
  const image = game.assets.banner600
    ? { url: game.assets.banner600 }
    : undefined

  if (deals.length === 0) {
    return {
      title: game.title,
      description: 'No store currently lists a price for this game.',
      color,
      image,
      fields: [buildIdField(game.id)],
    }
  }

  const sorted = [...deals].sort(
    (a, b) => a.price.amountInt - b.price.amountInt
  )
  const shown = sorted.slice(0, MAX_SHOPS_SHOWN)
  const remaining = sorted.length - shown.length

  const fields: APIEmbedField[] = shown.map(buildDealField)

  const historyLowField = buildHistoryLowField(
    historyLowInt,
    historyLowCurrency
  )
  if (historyLowField) fields.push(historyLowField)
  fields.push(buildIdField(game.id))

  return {
    title: game.title,
    color,
    image,
    fields,
    footer:
      remaining > 0
        ? { text: `+${remaining} more shop(s) not shown` }
        : undefined,
  }
}
