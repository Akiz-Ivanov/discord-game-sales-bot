import type { ItadDeal } from './itad'

export interface SaleAlert {
  wishlistItemId: number
  discordId: string
  gameId: number
  itadId: string
  title: string
  deal: ItadDeal
}

export interface GuildSaleAlerts {
  guildId: string
  notificationChannelId: string
  alerts: SaleAlert[]
}
