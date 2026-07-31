import { getWishlistedGamesByGuild } from '@/repositories/wishlist'
import { getPrices } from '@/itad/client'
import { shouldNotify } from '@/lib/shouldNotify'
import type { ItadDeal, GuildSaleAlerts } from '@/types'

//* Cheapest deal only — same "best price right now" framing buildPriceEmbed
//* already uses for /price's cheapest-first sort.
const pickCheapestDeal = (deals: ItadDeal[]): ItadDeal | undefined =>
  [...deals].sort((a, b) => a.price.amountInt - b.price.amountInt)[0]

//* Cron entry point. Pulls every wishlisted game across every guild with
//* a configured alert channel, fetches live prices in as few batched ITAD
//* calls as the 200-id cap allows, filters down to only what actually
//* warrants a notification (shouldNotify), and groups the result by guild
//* — ready for the Discord-posting step to iterate one message per guild.
//* Deliberately bypasses getGamePrices' same-day cache: this always wants
//* a live price, not whatever /price happened to cache earlier today.
export const getSaleAlerts = async (): Promise<GuildSaleAlerts[]> => {
  const rows = await getWishlistedGamesByGuild()
  if (rows.length === 0) return []

  const uniqueItadIds = [...new Set(rows.map((r) => r.itadId))]
  const priceData = await getPrices(uniqueItadIds)

  const cheapestByItadId = new Map(
    priceData.map((p) => [p.id, pickCheapestDeal(p.deals)])
  )

  const alertsByGuild = new Map<string, GuildSaleAlerts>()

  for (const row of rows) {
    const deal = cheapestByItadId.get(row.itadId)
    if (!deal) continue
    if (!shouldNotify(deal.cut, deal.price.amountInt, row.lastNotifiedPrice)) {
      continue
    }

    const guildAlerts = alertsByGuild.get(row.guildId) ?? {
      guildId: row.guildId,
      //* Safe to assert — getWishlistedGamesByGuild's WHERE clause already
      //* filters to guilds with a configured channel; Drizzle just can't
      //* encode that guarantee in the column's nullable TS type.
      notificationChannelId: row.notificationChannelId!,
      alerts: [],
    }
    guildAlerts.alerts.push({
      wishlistItemId: row.wishlistItemId,
      discordId: row.discordId,
      gameId: row.gameId,
      itadId: row.itadId,
      title: row.title,
      deal,
    })
    alertsByGuild.set(row.guildId, guildAlerts)
  }

  return [...alertsByGuild.values()]
}
