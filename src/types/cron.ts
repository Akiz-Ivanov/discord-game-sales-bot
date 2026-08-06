import type { ItadDeal } from './itad'

export interface SaleAlertRecipient {
  wishlistItemId: number
  discordId: string
}

export interface GameSaleAlert {
  gameId: number
  itadId: string
  title: string
  deal: ItadDeal
  recipients: SaleAlertRecipient[]
}

export interface GuildSaleAlerts {
  guildId: string
  notificationChannelId: string
  alerts: GameSaleAlert[]
}
