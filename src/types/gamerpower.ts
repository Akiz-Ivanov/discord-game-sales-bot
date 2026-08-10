export type GamerPowerGiveawayType = 'Game' | 'DLC' | 'Early Access' | 'Other'
export type GamerPowerGiveawayStatus = 'Active' | 'Expired'

export interface GamerPowerGiveaway {
  id: number
  title: string
  worth: string // e.g. "$19.99" or "N/A" — display-only passthrough, not
  // parsed to cents like ITAD's amountInt; this is GamerPower's own
  // formatted string
  thumbnail: string
  image: string
  description: string
  instructions: string
  open_giveaway_url: string
  published_date: string // "YYYY-MM-DD HH:mm:ss"
  type: GamerPowerGiveawayType
  platforms: string // comma-separated, e.g. "PC, Steam"
  end_date: string // "YYYY-MM-DD HH:mm:ss" or "N/A"
  users: number
  status: GamerPowerGiveawayStatus
  gamerpower_url: string
  open_giveaway: string
}
