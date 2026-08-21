import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISectionComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10'
import type { GamerPowerGiveaway } from '@/types'
import { buildPaginationRow } from '@/discord/interactions/buildPaginationRow'
import { clampPage, getTotalPages } from '@/lib/paginate'

const ACCENT_COLOR = 0xffb800

//* Lean mode (cron-posted public card): plain TextDisplay entries, no
//* images — 1 component per giveaway, keeps the automatic channel post
//* compact for everyone who didn't ask to see it.
export const MAX_GAMES_PER_MESSAGE = 9

//* Rich mode (/free, ephemeral, user-invoked): Section + Thumbnail
//* accessory per giveaway — 3 components each. Kept to 5/page not for
//* the 40-component budget (room to spare at this count) but purely for
//* screen real estate — thumbnails make each entry visibly taller.
export const MAX_GAMES_PER_MESSAGE_RICH = 5

const formatEndDate = (endDate: string): string | null => {
  if (endDate === 'N/A') return null
  const [datePart] = endDate.split(' ')
  if (!datePart) {
    throw new Error(`formatEndDate: unexpected end_date format "${endDate}"`)
  }
  const [year, month, day] = datePart.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`formatEndDate: unexpected end_date format "${endDate}"`)
  }
  const formatted = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', timeZone: 'UTC' }
  )
  return `Free until ${formatted}`
}

const formatDetailsLine = (giveaway: GamerPowerGiveaway): string =>
  [giveaway.worth !== 'N/A' ? giveaway.worth : null, giveaway.platforms]
    .filter(Boolean)
    .join(' · ')

const stripGiveawaySuffix = (title: string): string =>
  title.replace(/\s+Giveaway$/i, '')

//* Bumped one size step in each direction from the original design:
//* title from bold-only text up to a level-3 heading (biggest jump
//* available short of a heading that reads like a page title), and the
//* details/end-date lines from Discord's small "-# " subtext style down
//* to plain body text — there's no "medium" size in between either
//* direction, these are the two fixed steps available.
const buildEntryLines = (giveaway: GamerPowerGiveaway): string => {
  const endDateLine = formatEndDate(giveaway.end_date)
  const title = stripGiveawaySuffix(giveaway.title)
  const lines = [
    `### [${title}](${giveaway.open_giveaway_url})`,
    formatDetailsLine(giveaway),
  ]
  if (endDateLine) lines.push(endDateLine)
  return lines.join('\n')
}

const buildGiveawayText = (
  giveaway: GamerPowerGiveaway
): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content: buildEntryLines(giveaway),
})

const buildGiveawaySection = (
  giveaway: GamerPowerGiveaway
): APISectionComponent => ({
  type: ComponentType.Section,
  components: [
    { type: ComponentType.TextDisplay, content: buildEntryLines(giveaway) },
  ],
  accessory: {
    type: ComponentType.Thumbnail,
    media: { url: giveaway.thumbnail },
  },
})

const buildHeader = (count: number): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content: `🎁 **${count} free game${count === 1 ? '' : 's'} on PC right now!**`,
})

export const buildFreeGamesMessage = (
  giveaways: GamerPowerGiveaway[],
  page = 0,
  rich = false
): RESTPostAPIChannelMessageJSONBody => {
  const pageSize = rich ? MAX_GAMES_PER_MESSAGE_RICH : MAX_GAMES_PER_MESSAGE
  const navPrefix = rich ? 'free_games_page_rich' : 'free_games_page'

  const totalPages = getTotalPages(giveaways.length, pageSize)
  const clampedPage = clampPage(page, totalPages)
  const start = clampedPage * pageSize
  const shown = giveaways.slice(start, start + pageSize)

  const children: (
    APITextDisplayComponent | APISectionComponent | APISeparatorComponent
  )[] = [buildHeader(giveaways.length), { type: ComponentType.Separator }]

  shown.forEach((giveaway, idx) => {
    children.push(
      rich ? buildGiveawaySection(giveaway) : buildGiveawayText(giveaway)
    )
    if (idx < shown.length - 1) children.push({ type: ComponentType.Separator })
  })

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
    components.push(buildPaginationRow(navPrefix, clampedPage, totalPages))
  }

  return {
    flags: rich
      ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      : MessageFlags.IsComponentsV2,
    components,
  }
}
