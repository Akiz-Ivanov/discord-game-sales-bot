import type {
  APIEmbed,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10'
import type { SaleAlert } from '@/types'
import { formatMoney } from '@/lib/money'

const EMBED_COLOR_ON_SALE = 0x57f287
const MAX_EMBEDS_PER_MESSAGE = 10 // Discord's own per-message cap

//* Lean, one-line-per-game cards — deliberately NOT /price's full
//* multi-store breakdown. This is a push notification nobody explicitly
//* asked for right now; /price stays the place for the deep-dive.
const buildAlertEmbed = (alert: SaleAlert): APIEmbed => {
  const price = formatMoney(
    alert.deal.price.amountInt,
    alert.deal.price.currency
  )
  const regular = formatMoney(
    alert.deal.regular.amountInt,
    alert.deal.regular.currency
  )

  return {
    title: alert.title,
    url: alert.deal.url,
    description: `${price} (−${alert.deal.cut}%, was ${regular}) · ${alert.deal.shop.name}`,
    color: EMBED_COLOR_ON_SALE,
  }
}

export const buildSaleAlertMessage = (
  alerts: SaleAlert[]
): RESTPostAPIChannelMessageJSONBody => {
  const shown = alerts.slice(0, MAX_EMBEDS_PER_MESSAGE)
  const remaining = alerts.length - shown.length
  const plural = alerts.length === 1 ? '' : 's'
  const verb = alerts.length === 1 ? 'is' : 'are'

  return {
    content:
      `🔔 ${alerts.length} game${plural} on your wishlist ${verb} on sale!` +
      (remaining > 0 ? ` (+${remaining} more)` : ''),
    embeds: shown.map(buildAlertEmbed),
  }
}
