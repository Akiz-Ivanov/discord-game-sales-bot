import { describe, it, expect } from 'vitest'
import { buildSaleAlertMessage } from './saleAlert'
import { makeDeal } from '@/test/factories'
import type { SaleAlert } from '@/types'

const makeAlert = (overrides: Partial<SaleAlert> = {}): SaleAlert => ({
  wishlistItemId: 1,
  discordId: 'user-1',
  gameId: 10,
  itadId: 'itad-1',
  title: 'Hollow Knight',
  deal: makeDeal({ cut: 25 }),
  ...overrides,
})

describe('buildSaleAlertMessage', () => {
  it('uses singular phrasing for exactly one alert', () => {
    const message = buildSaleAlertMessage([makeAlert()])
    expect(message.content).toBe('🔔 1 game on your wishlist is on sale!')
  })

  it('uses plural phrasing for multiple alerts', () => {
    const message = buildSaleAlertMessage([
      makeAlert(),
      makeAlert({ gameId: 20 }),
    ])
    expect(message.content).toBe('🔔 2 games on your wishlist are on sale!')
  })

  it('builds one embed per alert with price, discount, and shop', () => {
    const message = buildSaleAlertMessage([
      makeAlert({
        title: 'Celeste',
        deal: makeDeal({
          cut: 40,
          price: { amount: 5.99, amountInt: 599, currency: 'USD' },
          regular: { amount: 9.99, amountInt: 999, currency: 'USD' },
          shop: { id: 61, name: 'Steam' },
        }),
      }),
    ])
    expect(message.embeds?.[0]).toMatchObject({
      title: 'Celeste',
      description: '$5.99 (−40%, was $9.99) · Steam',
    })
  })

  it('caps embeds at 10 and notes the remainder in content', () => {
    const alerts = Array.from({ length: 13 }, (_, i) =>
      makeAlert({ gameId: i, title: `Game ${i}` })
    )
    const message = buildSaleAlertMessage(alerts)

    expect(message.embeds).toHaveLength(10)
    expect(message.content).toContain('(+3 more)')
  })

  it('omits the remainder note when everything fits', () => {
    const message = buildSaleAlertMessage([makeAlert()])
    expect(message.content).not.toContain('more)')
  })
})
