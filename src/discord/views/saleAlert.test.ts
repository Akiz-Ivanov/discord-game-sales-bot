import { describe, it, expect } from 'vitest'
import { buildSaleAlertMessage, MAX_ALERTS_PER_MESSAGE } from './saleAlert'
import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISectionComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'
import { makeDeal } from '@/test/factories'
import type { GameSaleAlert } from '@/types'

const makeAlert = (overrides: Partial<GameSaleAlert> = {}): GameSaleAlert => ({
  gameId: 10,
  itadId: 'itad-1',
  title: 'Hollow Knight',
  deal: makeDeal({ cut: 25 }),
  recipients: [{ wishlistItemId: 1, discordId: 'user-1' }],
  ...overrides,
})

const getContainer = (r: ReturnType<typeof buildSaleAlertMessage>) =>
  r.components![0] as APIContainerComponent
const getSections = (c: APIContainerComponent) =>
  c.components.filter(
    (x): x is APISectionComponent => x.type === ComponentType.Section
  )
const getSectionText = (s: APISectionComponent) =>
  (s.components[0] as APITextDisplayComponent).content

describe('buildSaleAlertMessage', () => {
  it('sets the IsComponentsV2 flag', () => {
    expect(buildSaleAlertMessage([makeAlert()]).flags).toBe(
      MessageFlags.IsComponentsV2
    )
  })

  it('wraps everything in one Container with the on-sale accent color', () => {
    const container = getContainer(buildSaleAlertMessage([makeAlert()]))
    expect(container.type).toBe(ComponentType.Container)
    expect(container.accent_color).toBe(0x57f287)
  })

  it('builds one Section per game with price, discount, and shop', () => {
    const container = getContainer(
      buildSaleAlertMessage([
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
    )
    const content = getSectionText(getSections(container)[0])
    expect(content).toContain('Celeste')
    expect(content).toContain('$5.99 (−40%, was $9.99)')
    expect(content).toContain('Steam')
  })

  it('mentions every recipient for that game', () => {
    const container = getContainer(
      buildSaleAlertMessage([
        makeAlert({
          recipients: [
            { wishlistItemId: 1, discordId: 'user-1' },
            { wishlistItemId: 2, discordId: 'user-2' },
          ],
        }),
      ])
    )
    const content = getSectionText(getSections(container)[0])
    expect(content).toContain('<@user-1>')
    expect(content).toContain('<@user-2>')
  })

  it('caps mentions shown and notes the remainder', () => {
    const recipients = Array.from({ length: 13 }, (_, i) => ({
      wishlistItemId: i,
      discordId: `user-${i}`,
    }))
    const content = getSectionText(
      getSections(
        getContainer(buildSaleAlertMessage([makeAlert({ recipients })]))
      )[0]
    )
    expect(content).toContain('+3 more')
  })

  it('scopes allowed_mentions to exactly the shown recipients', () => {
    const result = buildSaleAlertMessage([
      makeAlert({ recipients: [{ wishlistItemId: 1, discordId: 'user-1' }] }),
      makeAlert({
        gameId: 20,
        recipients: [{ wishlistItemId: 2, discordId: 'user-2' }],
      }),
    ])
    expect(result.allowed_mentions).toEqual({
      parse: [],
      users: ['user-1', 'user-2'],
    })
  })

  it('gives each game a "Check price" accessory button keyed by its itadId', () => {
    const container = getContainer(
      buildSaleAlertMessage([makeAlert({ itadId: 'itad-abc' })])
    )
    expect(getSections(container)[0].accessory).toMatchObject({
      type: ComponentType.Button,
      custom_id: 'sale_check_price:itad-abc',
      label: 'Check price',
    })
  })

  it(`caps display at ${MAX_ALERTS_PER_MESSAGE} games and notes how many more exist`, () => {
    const alerts = Array.from({ length: MAX_ALERTS_PER_MESSAGE + 3 }, (_, i) =>
      makeAlert({ gameId: i, itadId: `itad-${i}`, title: `Game ${i}` })
    )
    const container = getContainer(buildSaleAlertMessage(alerts))
    expect(getSections(container)).toHaveLength(MAX_ALERTS_PER_MESSAGE)
    const last = container.components[
      container.components.length - 1
    ] as APITextDisplayComponent
    expect(last.content).toContain('+3 more sales not shown')
  })

  it('omits the remainder note when everything fits', () => {
    const texts = getContainer(
      buildSaleAlertMessage([makeAlert()])
    ).components.filter(
      (c) => c.type === ComponentType.TextDisplay
    ) as APITextDisplayComponent[]
    expect(texts.some((t) => t.content.includes('more sale'))).toBe(false)
  })

  it('uses singular phrasing for exactly one alert', () => {
    const header = getContainer(buildSaleAlertMessage([makeAlert()]))
      .components[0] as APITextDisplayComponent
    expect(header.content).toContain('1 wishlisted game is on sale')
  })

  it('uses plural phrasing for multiple alerts', () => {
    const header = getContainer(
      buildSaleAlertMessage([makeAlert(), makeAlert({ gameId: 20 })])
    ).components[0] as APITextDisplayComponent
    expect(header.content).toContain('2 wishlisted games are on sale')
  })
})
