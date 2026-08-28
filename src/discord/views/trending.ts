import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'
import type { ItadDealListItem } from '@/types'
import { formatMoney } from '@/lib/money'
import { getShopEmoji } from '@/discord/embeds/shopEmoji'
import { buildPaginationRow } from '@/discord/interactions/buildPaginationRow'
import { clampPage, getTotalPages } from '@/lib/paginate'
import { customEmojiTag } from '../embeds/discordEmoji'

const ACCENT_COLOR = 0xda70d6
const DEALS_PAGE_URL = 'https://isthereanydeal.com/deals/'

export const MAX_TRENDING_PER_PAGE = 15

const CHART_LINE_DOWN_ID = '1530575847679856821'

const FLAG_LABELS: Record<string, string> = {
  N: `${customEmojiTag('new', '1541817006125223996')} New low`,
  H: `${customEmojiTag('chartlinedown', CHART_LINE_DOWN_ID)} Historical low`,
  S: '🏷️ Lowest here',
}

const buildEntryLine = (item: ItadDealListItem): string => {
  const { deal } = item
  const price = formatMoney(deal.price.amountInt, deal.price.currency)
  const priceLine =
    deal.cut > 0
      ? `**${price}** (−${deal.cut}%, was ${formatMoney(deal.regular.amountInt, deal.regular.currency)})`
      : `**${price}**`
  const shop = `${getShopEmoji(deal.shop.name)}${deal.shop.name}`
  const flagLabel = deal.flag ? FLAG_LABELS[deal.flag] : null

  return [
    `**[${item.title}](${deal.url})**`,
    `-# ${priceLine} · ${shop}${flagLabel ? ` · ${flagLabel}` : ''}`,
  ].join('\n')
}

const buildEntryText = (item: ItadDealListItem): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content: buildEntryLine(item),
})

const buildHeader = (): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content: '🔥 **Trending deals right now**',
})

const buildFooter = (): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content: `-# More on the [full deals page](${DEALS_PAGE_URL})`,
})

export const buildTrendingMessage = (deals: ItadDealListItem[], page = 0) => {
  const totalPages = getTotalPages(deals.length, MAX_TRENDING_PER_PAGE)
  const clampedPage = clampPage(page, totalPages)
  const start = clampedPage * MAX_TRENDING_PER_PAGE
  const shown = deals.slice(start, start + MAX_TRENDING_PER_PAGE)

  const children: (APITextDisplayComponent | APISeparatorComponent)[] = [
    buildHeader(),
    { type: ComponentType.Separator },
  ]

  shown.forEach((item, idx) => {
    children.push(buildEntryText(item))
    if (idx < shown.length - 1) children.push({ type: ComponentType.Separator })
  })

  children.push({ type: ComponentType.Separator })
  children.push(buildFooter())

  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: ACCENT_COLOR,
    components: children,
  }

  const components: (
    | APIContainerComponent
    | APIActionRowComponent<APIButtonComponentWithCustomId>
  )[] = [container]

  if (totalPages > 1) {
    components.push(
      buildPaginationRow('trending_page', clampedPage, totalPages)
    )
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components,
  }
}
