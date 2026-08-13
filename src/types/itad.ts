export type ItadGameType = 'game' | 'dlc' | 'package' | null

export interface ItadGameAssets {
  banner145?: string
  banner300?: string
  banner400?: string
  banner600?: string
  boxart?: string
}

export interface ItadGameReview {
  score: number
  source: string
  count: number
  url: string
}

export interface ItadGamePlayers {
  recent: number
  day: number
  week: number
  peak: number
}

export interface ItadGameUrls {
  game: string
}

export interface ItadGame {
  id: string // ITAD's canonical UUID
  slug: string
  title: string
  type: ItadGameType
  mature: boolean
  assets: ItadGameAssets
  //* Only populated when resolved via the ITAD-ID branch of resolveGame()
  appid?: number
  tags?: string[]
  releaseDate?: string // "YYYY-MM-DD"
  reviews?: ItadGameReview[]
  players?: ItadGamePlayers
  urls?: ItadGameUrls
}

export interface ItadLookupResponse {
  found: boolean
  game?: ItadGame
}

export type ItadSearchResponse = ItadGame[]

export interface ItadMoney {
  amount: number
  amountInt: number // integer cents — matches your prices.priceAmount column
  currency: string // ISO 4217, e.g. "USD"
}

export interface ItadShop {
  id: number
  name: string
}

export interface ItadDrm {
  id: number
  name: string
}

export interface ItadPlatform {
  id: number
  name: string
}

export interface ItadDeal {
  shop: ItadShop
  price: ItadMoney
  regular: ItadMoney
  cut: number // percent off, 0 if not on sale
  voucher: string | null
  storeLow: ItadMoney | null
  flag: string | null
  drm: ItadDrm[]
  platforms: ItadPlatform[]
  timestamp: string // ISO 8601
  expiry: string | null
  url: string
}

export interface ItadHistoryLow {
  all?: ItadMoney
  y1?: ItadMoney
  m3?: ItadMoney
}

export interface ItadGamePrices {
  id: string
  historyLow: ItadHistoryLow
  deals: ItadDeal[]
}

export type ItadMoneySummary = Pick<ItadMoney, 'amountInt' | 'currency'>

// Deliberately narrower than ItadDeal — only the fields formatDealsReply
// actually reads. A live ITAD deal structurally satisfies this for free;
// a reconstructed DB row doesn't have to fake the rest (voucher, drm,
// platforms, etc.) just to typecheck.

export interface DealSummary extends Pick<ItadDeal, 'cut' | 'url'> {
  shop: Pick<ItadShop, 'name'>
  price: ItadMoneySummary
  regular: ItadMoneySummary
}

export interface PriceSnapshot {
  deals: DealSummary[]
  historyLowInt?: number
  historyLowCurrency?: string
}

export interface ItadBundleGame {
  title: string
}

export interface ItadBundleTier {
  price: { amount: number; amountInt: number; currency: string } | null
  games: ItadBundleGame[]
}

export interface ItadBundle {
  id: number
  title: string
  page: { id: number; name: string; shopId: number | null }
  url: string
  details: string
  expiry: string
  counts: { games: number; media: number }
  tiers: ItadBundleTier[]
}
