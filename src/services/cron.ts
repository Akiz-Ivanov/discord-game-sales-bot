import {
  getWishlistedGamesByGuild,
  updateLastNotifiedPrices,
} from '@/repositories/wishlist'
import { getPrices } from '@/itad/client'
import { shouldNotify } from '@/lib/shouldNotify'
import type { GuildSaleAlerts, GameSaleAlert } from '@/types'
import { pickCheapestDeal } from '@/lib/pickCheapestDeal'

type GroupedAlert = GameSaleAlert & {
  guildId: string
  notificationChannelId: string
}

export const getSaleAlerts = async (): Promise<GuildSaleAlerts[]> => {
  const rows = await getWishlistedGamesByGuild()
  if (rows.length === 0) return []

  const uniqueItadIds = [...new Set(rows.map((r) => r.itadId))]
  const priceData = await getPrices(uniqueItadIds)
  const cheapestByItadId = new Map(
    priceData.map((p) => [p.id, pickCheapestDeal(p.deals)])
  )

  //* Rows whose game just fell off sale — clears their notified-price
  //* floor so a *future* sale, even at a price identical to last time,
  //* is treated as fresh instead of getting filtered by shouldNotify's
  //* "must be strictly lower" check.
  const resets: { wishlistItemId: number; price: null }[] = []

  //* One entry per (guild, game) — every wishlist row that resolves to
  //* the same pair gets folded into that entry's recipients list.
  const alertsByGuildAndGame = new Map<string, GroupedAlert>()

  for (const row of rows) {
    const deal = cheapestByItadId.get(row.itadId)
    if (!deal) continue

    if (deal.cut === 0) {
      if (row.lastNotifiedPrice !== null) {
        resets.push({ wishlistItemId: row.wishlistItemId, price: null })
      }
      continue
    }

    if (!shouldNotify(deal.cut, deal.price.amountInt, row.lastNotifiedPrice)) {
      continue
    }

    const key = `${row.guildId}:${row.itadId}`
    const existing = alertsByGuildAndGame.get(key)
    const recipient = {
      wishlistItemId: row.wishlistItemId,
      discordId: row.discordId,
    }

    if (existing) {
      existing.recipients.push(recipient)
    } else {
      alertsByGuildAndGame.set(key, {
        guildId: row.guildId,
        notificationChannelId: row.notificationChannelId!,
        gameId: row.gameId,
        itadId: row.itadId,
        title: row.title,
        deal,
        recipients: [recipient],
      })
    }
  }

  //* Pure bookkeeping, independent of whether tonight's Discord post
  //* succeeds — a stale notified-price floor is a data problem, not a
  //* delivery problem, so it's corrected unconditionally.
  if (resets.length > 0) await updateLastNotifiedPrices(resets)

  const alertsByGuild = new Map<string, GuildSaleAlerts>()
  for (const {
    guildId,
    notificationChannelId,
    ...alert
  } of alertsByGuildAndGame.values()) {
    const guildAlerts = alertsByGuild.get(guildId) ?? {
      guildId,
      notificationChannelId,
      alerts: [],
    }
    guildAlerts.alerts.push(alert)
    alertsByGuild.set(guildId, guildAlerts)
  }

  return [...alertsByGuild.values()]
}
