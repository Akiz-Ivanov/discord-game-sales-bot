import { ComponentType, MessageFlags, ButtonStyle } from 'discord-api-types/v10'
import type {
  AllowedMentionsTypes,
  APIContainerComponent,
  APISectionComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10'
import type { GameSaleAlert } from '@/types'
import { formatMoney } from '@/lib/money'
import { getShopEmoji } from '@/discord/embeds/shopEmoji'

const ACCENT_COLOR_ON_SALE = 0x9b59b6
export const MAX_ALERTS_PER_MESSAGE = 9 //* component budget, same math as wishlistList's 9-item cap
const MAX_MENTIONS_SHOWN = 10 //* caps a wall of pings on a very-wishlisted game, not a component-budget concern

const formatDealLine = (deal: GameSaleAlert['deal']): string => {
  const price = formatMoney(deal.price.amountInt, deal.price.currency)
  const regular = formatMoney(deal.regular.amountInt, deal.regular.currency)
  return `${price} (−${deal.cut}%, was ${regular}) · ${getShopEmoji(deal.shop.name)}${deal.shop.name}`
}

const formatMentions = (recipients: GameSaleAlert['recipients']): string => {
  const ids = [...new Set(recipients.map((r) => r.discordId))]
  const shown = ids.slice(0, MAX_MENTIONS_SHOWN)
  const remaining = ids.length - shown.length
  const mentions = shown.map((id) => `<@${id}>`).join(' ')
  return remaining > 0 ? `${mentions} +${remaining} more` : mentions
}

//* Title links to the deal's own store URL — the cheapest listing right
//* now — since a click straight to the sale is more useful here than a
//* link to ITAD's page. Accessory is capped at one component (button OR
//* thumbnail), so "Check price" wins over "Remove" for v1 — it surfaces
//* the full multi-store breakdown an alert deliberately omits, which
//* feels like the more urgent action right after seeing a ping.
const buildAlertSection = (alert: GameSaleAlert): APISectionComponent => ({
  type: ComponentType.Section,
  components: [
    {
      type: ComponentType.TextDisplay,
      content:
        `**[${alert.title}](${alert.deal.url})**\n` +
        `-# ${formatDealLine(alert.deal)}\n` +
        `-# Wishlisted by ${formatMentions(alert.recipients)}`,
    },
  ],
  accessory: {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    label: 'Check price',
    custom_id: `sale_check_price:${alert.itadId}`,
  },
})

const buildHeader = (count: number): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content: `🔔 **${count} wishlisted game${count === 1 ? '' : 's'} ${count === 1 ? 'is' : 'are'} on sale!**`,
})

//* Scopes pings to exactly the recipients we intend to notify — defense
//* in depth in case content ever contains something mention-shaped that
//* wasn't meant to ping (e.g. a game titled with an @ in it).
const buildAllowedMentions = (alerts: GameSaleAlert[]) => ({
  parse: [] as AllowedMentionsTypes[],
  users: [
    ...new Set(alerts.flatMap((a) => a.recipients.map((r) => r.discordId))),
  ],
})

export const buildSaleAlertMessage = (
  alerts: GameSaleAlert[]
): RESTPostAPIChannelMessageJSONBody => {
  const shown = alerts.slice(0, MAX_ALERTS_PER_MESSAGE)
  const remaining = alerts.length - shown.length

  const children: (
    APITextDisplayComponent | APISectionComponent | APISeparatorComponent
  )[] = [buildHeader(alerts.length), { type: ComponentType.Separator }]

  shown.forEach((alert, idx) => {
    children.push(buildAlertSection(alert))
    if (idx < shown.length - 1) children.push({ type: ComponentType.Separator })
  })

  if (remaining > 0) {
    children.push({ type: ComponentType.Separator })
    children.push({
      type: ComponentType.TextDisplay,
      content: `-# +${remaining} more sale${remaining === 1 ? '' : 's'} not shown`,
    })
  }

  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: ACCENT_COLOR_ON_SALE,
    components: children,
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    allowed_mentions: buildAllowedMentions(shown),
    components: [container],
  }
}
