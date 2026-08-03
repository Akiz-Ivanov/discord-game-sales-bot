export const formatMoney = (amountInt: number, currency: string) => {
  if (amountInt === 0) return 'Free'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountInt / 100)
}
