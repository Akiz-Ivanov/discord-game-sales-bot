// src/discord/views/bundlesList.ts
import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'
import type { ItadBundle } from '@/types'
import { formatMoney } from '@/lib/money'
import { buildPaginationRow } from '@/discord/interactions/buildPaginationRow'
import { clampPage, getTotalPages } from '@/lib/paginate'
import { customEmojiTag } from '@/discord/embeds/discordEmoji'

export const MAX_BUNDLES_PER_PAGE = 9
const ACCENT_COLOR = 0x89cff0 // pale sky blue

const BUNDLE_EMOJI_ID = '1547932904292614204'

const formatDaysRemaining = (expiry: string): string => {
  const now = new Date()
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )

  const expiryDate = new Date(expiry)
  const expiryUTC = Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate()
  )

  const days = Math.round((expiryUTC - todayUTC) / 86_400_000)
  if (days <= 0) return 'Ends today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

const formatTierPrice = (tier: ItadBundle['tiers'][number]): string =>
  tier.price
    ? `**${formatMoney(tier.price.amountInt, tier.price.currency)}**`
    : '**Price varies**'

const buildBundleLine = (bundle: ItadBundle): string => {
  const cheapestTier = bundle.tiers[0]
  const priceLine = cheapestTier ? formatTierPrice(cheapestTier) : 'N/A'
  return (
    `**[${bundle.title}](${bundle.url})**\n` +
    `-# ${bundle.page.name} · ${bundle.counts.games} games from ${priceLine} · ${formatDaysRemaining(bundle.expiry)}`
  )
}

const buildHeader = (count: number): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content: `${customEmojiTag('bundle', BUNDLE_EMOJI_ID)} **${count} active bundle${count === 1 ? '' : 's'}**`,
})

export const buildBundlesListMessage = (bundles: ItadBundle[], page = 0) => {
  if (bundles.length === 0) {
    const container: APIContainerComponent = {
      type: ComponentType.Container,
      accent_color: ACCENT_COLOR,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: 'No active bundles right now — check back soon.',
        },
      ],
    }
    return {
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      components: [container],
    }
  }

  const totalPages = getTotalPages(bundles.length, MAX_BUNDLES_PER_PAGE)
  const clampedPage = clampPage(page, totalPages)
  const start = clampedPage * MAX_BUNDLES_PER_PAGE
  const shown = bundles.slice(start, start + MAX_BUNDLES_PER_PAGE)

  const children: (APITextDisplayComponent | APISeparatorComponent)[] = [
    buildHeader(bundles.length),
    { type: ComponentType.Separator },
  ]

  shown.forEach((bundle, idx) => {
    children.push({
      type: ComponentType.TextDisplay,
      content: buildBundleLine(bundle),
    })
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
    components.push(buildPaginationRow('bundles_page', clampedPage, totalPages))
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components,
  }
}
