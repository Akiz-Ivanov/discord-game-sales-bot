//* The MVP notify rule: on sale, and the price differs from the last
//* alert sent for this specific wishlist item. Deliberately isolated as
//* its own function — per-user thresholds (min % off, price ceiling,
//* historical-low-only, store filter) are a real future feature, and
//* keeping the decision in one place means that's a small change later,
//* not a redesign of the cron pipeline around it.
export const shouldNotify = (
  cut: number,
  currentPriceInt: number,
  lastNotifiedPrice: number | null
): boolean => {
  return cut > 0 && currentPriceInt !== lastNotifiedPrice
}
