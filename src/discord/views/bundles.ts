// src/discord/views/bundles.ts
import { MessageFlags } from 'discord-api-types/v10'
import type { APIEmbed } from 'discord-api-types/v10'
import type { ItadBundle } from '@/types'
import { formatMoney } from '@/lib/money'

const MAX_BUNDLES_SHOWN = 5
const ACCENT_COLOR = 0xe67e22 // orange

const formatTierPrice = (tier: ItadBundle['tiers'][number]): string =>
  tier.price
    ? formatMoney(tier.price.amountInt, tier.price.currency)
    : 'Free tier'

const formatBundleLine = (bundle: ItadBundle): string => {
  const cheapestTier = bundle.tiers[0]
  const priceLine = cheapestTier ? formatTierPrice(cheapestTier) : 'N/A'
  return (
    `**[${bundle.title}](${bundle.url})**\n` +
    `-# ${bundle.page.name} · ${bundle.counts.games} games from ${priceLine}`
  )
}

export const buildBundlesMessage = (
  bundles: ItadBundle[],
  gameTitle: string
) => {
  if (bundles.length === 0) {
    return {
      flags: MessageFlags.Ephemeral,
      embeds: [
        {
          description: `No active bundles currently include **${gameTitle}**.`,
          color: ACCENT_COLOR,
        } satisfies APIEmbed,
      ],
    }
  }

  const shown = bundles.slice(0, MAX_BUNDLES_SHOWN)
  const remaining = bundles.length - shown.length

  const embed: APIEmbed = {
    title: `📦 ${gameTitle} — ${bundles.length} active bundle${bundles.length === 1 ? '' : 's'}`,
    description: shown.map(formatBundleLine).join('\n\n'),
    color: ACCENT_COLOR,
    footer:
      remaining > 0
        ? { text: `+${remaining} more bundle(s) not shown` }
        : undefined,
  }

  return { flags: MessageFlags.Ephemeral, embeds: [embed] }
}
