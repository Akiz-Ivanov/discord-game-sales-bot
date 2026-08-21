import type { APIEmbed, APIEmbedField } from 'discord-api-types/v10'
import type {
  ItadGame,
  DealSummary,
  ItadGameReview,
  ItadGamePlayers,
} from '@/types'
import { formatMoney } from '@/lib/money'
import { getShopEmoji } from './shopEmoji'
import { getDiscountEmoji } from './discountEmoji'
import { customEmojiTag } from './discordEmoji'
import { formatCompactNumber } from '@/lib/formatCompactNumber'

const EMBED_COLOR_ON_SALE = 0x57f287
const EMBED_COLOR_NO_SALE = 0x5865f2
const EMBED_COLOR_NO_DEALS = 0x99aab5

const MAX_SHOPS_SHOWN = 5
const MAX_TAGS_SHOWN = 5
const PREFERRED_REVIEW_SOURCE = 'Steam'

const formatReleaseDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`formatReleaseDate: unexpected date format "${dateStr}"`)
  }
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

const pickPrimaryReview = (
  reviews: ItadGameReview[]
): ItadGameReview | undefined =>
  reviews.find((r) => r.source === PREFERRED_REVIEW_SOURCE) ?? reviews[0]

const formatReviewScore = (review: ItadGameReview): string => {
  const count = formatCompactNumber(review.count)
  return `${review.score}% (${review.source} · ${count})`
}

const formatPlayerCounts = (players: ItadGamePlayers): string => {
  return `${formatCompactNumber(players.recent)} now · ${formatCompactNumber(players.peak)} peak`
}

const formatTags = (tags: string[]): string =>
  tags
    .slice(0, MAX_TAGS_SHOWN)
    .map((t) => `\`${t}\``)
    .join(' ')

//* Only produces fields when the underlying data is present — a no-op on
//* the search/v1 and lookup/v1 paths, since ItadGame's extra fields are
//* undefined there. This is what keeps those embeds exactly as lean as
//* they are today without any branching on "which resolveGame path ran".
const buildEnrichmentFields = (game: ItadGame): APIEmbedField[] => {
  const fields: APIEmbedField[] = []

  if (game.releaseDate) {
    fields.push({
      name: '📅 Released',
      value: formatReleaseDate(game.releaseDate),
      inline: true,
    })
  }

  const primaryReview = game.reviews?.length
    ? pickPrimaryReview(game.reviews)
    : undefined
  if (primaryReview) {
    fields.push({
      name: '⭐ Reviews',
      value: formatReviewScore(primaryReview),
      inline: true,
    })
  }

  if (game.players) {
    fields.push({
      name: '🎮 Players',
      value: formatPlayerCounts(game.players),
      inline: true,
    })
  }

  if (game.tags?.length) {
    fields.push({
      name: '🏷️ Tags',
      value: formatTags(game.tags),
      inline: false,
    })
  }

  return fields
}

const pickEmbedColor = (deals: DealSummary[]) => {
  if (deals.length === 0) return EMBED_COLOR_NO_DEALS
  return deals.some((d) => d.cut > 0)
    ? EMBED_COLOR_ON_SALE
    : EMBED_COLOR_NO_SALE
}

const CHART_LINE_DOWN_ID = '1530575847679856821'

const buildDealField = (
  deal: DealSummary,
  moreStoresLine: string | null
): APIEmbedField => {
  const price = formatMoney(deal.price.amountInt, deal.price.currency)
  const priceLine =
    deal.cut > 0
      ? `${price} (−${deal.cut}%, was ${formatMoney(deal.regular.amountInt, deal.regular.currency)}) ${getDiscountEmoji(deal.cut)}`
      : price

  const trailer = moreStoresLine ? `\n-# ${moreStoresLine}` : ''

  return {
    name: `${getShopEmoji(deal.shop.name)} ${deal.shop.name}`,
    value: `> [${priceLine}](${deal.url})${trailer}`,
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
  const enrichmentFields = buildEnrichmentFields(game)

  if (deals.length === 0) {
    return {
      title: game.title,
      url: game.urls?.game,
      description: 'No store currently lists a price for this game.',
      color,
      image,
      fields: enrichmentFields.length > 0 ? enrichmentFields : undefined,
    }
  }

  const sorted = [...deals].sort(
    (a, b) => a.price.amountInt - b.price.amountInt
  )
  const shown = sorted.slice(0, MAX_SHOPS_SHOWN)
  const remaining = sorted.length - shown.length

  const fields: APIEmbedField[] = shown.map((deal, idx) => {
    const isLast = idx === shown.length - 1
    const moreStoresLine =
      isLast && remaining > 0 ? `+${remaining} more stores` : null
    return buildDealField(deal, moreStoresLine)
  })

  const historyLowField = buildHistoryLowField(
    historyLowInt,
    historyLowCurrency
  )
  if (historyLowField) fields.push(historyLowField)
  fields.push(...enrichmentFields)

  return {
    title: game.title,
    url: game.urls?.game,
    color,
    image,
    fields,
  }
}
