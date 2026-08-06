//* Notify once per genuine price improvement. cut===0 rows never reach
//* here — services/cron.ts handles those separately (resets
//* lastNotifiedPrice back to null so a *future* sale, even at the same
//* price as last time, counts as fresh). The cut<=0 guard stays as a
//* defensive default so this function is safe to call standalone.
export const shouldNotify = (
  cut: number,
  currentPriceInt: number,
  lastNotifiedPrice: number | null
): boolean => {
  if (cut <= 0) return false
  return lastNotifiedPrice === null || currentPriceInt < lastNotifiedPrice
}