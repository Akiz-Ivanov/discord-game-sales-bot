import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPriceLookupResponse } from './buildPriceLookupResponse'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { isGameWishlisted } from '@/services/wishlist'
import { MessageFlags } from 'discord-api-types/v10'
import type { APIEmbed } from 'discord-api-types/v10'
import { game, makeGameRow } from '@/test/factories'

vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/services/prices', () => ({ getGamePrices: vi.fn() }))
vi.mock('@/repositories/games', () => ({ upsertGame: vi.fn() }))
vi.mock('@/discord/embeds/price', () => ({ buildPriceEmbed: vi.fn() }))
vi.mock('@/services/wishlist', () => ({ isGameWishlisted: vi.fn() }))

const discordId = '255361746758402048'
const guildId = '999888777666555444'

beforeEach(() => vi.clearAllMocks())

describe('buildPriceLookupResponse', () => {
  it('reports no match found', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = await buildPriceLookupResponse(
      'nonexistent',
      discordId,
      guildId,
      false
    )

    expect(data.content).toBe(`Couldn't find a game matching "nonexistent".`)
    expect(data.flags).toBeUndefined()
    expect(upsertGame).not.toHaveBeenCalled()
  })

  it('offers candidates via price_select buttons on multiple matches', async () => {
    const matches = [game, { ...game, id: 'id-2', title: 'Other Game' }]
    vi.mocked(resolveGame).mockResolvedValue(matches)

    const data = await buildPriceLookupResponse(
      'game',
      discordId,
      guildId,
      false
    )

    expect(data.content).toBe('Multiple games found — pick one:')
    const row = data.components?.[0]
    const buttons = row && 'components' in row ? row.components : []
    expect(buttons[0]).toMatchObject({ custom_id: `price_select:${game.id}` })
    expect(upsertGame).not.toHaveBeenCalled()
  })

  it('resolves a single match through upsert → prices → embed, with a wishlist toggle button', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue(makeGameRow({ id: 1 }))
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [],
      historyLowInt: 509,
      historyLowCurrency: 'USD',
    })
    vi.mocked(isGameWishlisted).mockResolvedValue(false)
    const fakeEmbed = { title: 'Hollow Knight' } as APIEmbed
    vi.mocked(buildPriceEmbed).mockReturnValue(fakeEmbed)

    const data = await buildPriceLookupResponse(
      'hollow knight',
      discordId,
      guildId,
      false
    )

    expect(upsertGame).toHaveBeenCalledWith(game)
    expect(getGamePrices).toHaveBeenCalledWith(1, game.id)
    expect(buildPriceEmbed).toHaveBeenCalledWith(game, [], 509, 'USD')
    expect(isGameWishlisted).toHaveBeenCalledWith(discordId, 1)
    expect(data.embeds).toEqual([fakeEmbed])
    const row = data.components?.[0]
    const button = row && 'components' in row ? row.components[0] : undefined
    expect(button).toMatchObject({ label: '➕ Add to wishlist' })
  })

  it('shows only the bundles button when discordId/guildId are absent (DM)', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue(makeGameRow({ id: 1 }))
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
    vi.mocked(buildPriceEmbed).mockReturnValue({} as APIEmbed)

    const data = await buildPriceLookupResponse(
      'hollow knight',
      undefined,
      undefined,
      false
    )

    const row = data.components?.[0]
    const button = row && 'components' in row ? row.components[0] : undefined
    expect(button).toMatchObject({ custom_id: `price_bundles:${game.id}` })
    expect(isGameWishlisted).not.toHaveBeenCalled()
  })

  it('sets the Ephemeral flag when ephemeral is true', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])
    const data = await buildPriceLookupResponse('x', discordId, guildId, true)
    expect(data.flags).toBe(MessageFlags.Ephemeral)
  })
})
