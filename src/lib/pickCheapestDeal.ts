interface HasPrice {
  price: { amountInt: number }
}

//* Cheapest deal only — shared by cron's sale-alert pipeline and
//* wishlist's initial-price seeding, both want "best price right now".
//* Generic over T so callers get back their own deal type (ItadDeal,
//* DealSummary, etc.) unchanged.
export const pickCheapestDeal = <T extends HasPrice>(
  deals: T[]
): T | undefined =>
  [...deals].sort((a, b) => a.price.amountInt - b.price.amountInt)[0]
