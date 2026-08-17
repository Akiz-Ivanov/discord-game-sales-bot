import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildWishlistAddResponse } from './buildWishlistAddResponse'
import { resolveGame } from '@/services/games'
import { addGameToWishlist, getWishlist } from '@/services/wishlist'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { buildWishlistRemoveMessage } from '@/discord/views/wishlistRemove'
import { MessageFlags } from 'discord-api-types/v10'
import type { APIEmbed } from 'discord-api-types/v10'
import { game, makeWishlistItemRow, makeGameRow } from '@/test/factories'

vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/services/wishlist', () => ({
  addGameToWishlist: vi.fn(),
  getWishlist: vi.fn(),
}))
vi.mock('@/discord/embeds/price', () => ({ buildPriceEmbed: vi.fn() }))
vi.mock('@/discord/views/wishlistRemove', () => ({
  buildWishlistRemoveMessage: vi.fn(),
}))

const discordId = '255361746758402048'
const guildId = '999888777666555444'

beforeEach(() => vi.clearAllMocks())

describe('buildWishlistAddResponse', () => {
  it('reports no match found', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = await buildWishlistAddResponse(
      'nonexistent',
      discordId,
      guildId,
      true
    )

    expect(data.content).toBe(`Couldn't find a game matching "nonexistent".`)
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    expect(addGameToWishlist).not.toHaveBeenCalled()
  })

  it('offers candidates via wishlist_add_select buttons on multiple matches', async () => {
    const matches = [game, { ...game, id: 'id-2', title: 'Other Game' }]
    vi.mocked(resolveGame).mockResolvedValue(matches)

    const data = await buildWishlistAddResponse(
      'game',
      discordId,
      guildId,
      true
    )

    expect(data.content).toBe('Multiple games found — pick one:')
    const row = data.components?.[0]
    const buttons = row && 'components' in row ? row.components : []
    expect(buttons[0]).toMatchObject({
      custom_id: `wishlist_add_select:${game.id}`,
    })
    expect(addGameToWishlist).not.toHaveBeenCalled()
  })

  it('reports already-on-wishlist without an embed', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({
      status: 'already_exists',
      priceSnapshot: {
        deals: [],
        historyLowInt: undefined,
        historyLowCurrency: undefined,
      },
    })

    const data = await buildWishlistAddResponse(
      'hollow knight',
      discordId,
      guildId,
      true
    )

    expect(data.content).toBe(`**${game.title}** is already on your wishlist.`)
    expect(data.embeds).toBeUndefined()
    expect(buildPriceEmbed).not.toHaveBeenCalled()
  })

  it('returns the limit-reached remove picker when the wishlist is full', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({ status: 'limit_reached' })
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 2, title: 'Celeste' }) }),
    ])
    const fakePicker = {
      flags: MessageFlags.Ephemeral,
      content: 'limit reached',
      components: [],
    }
    vi.mocked(buildWishlistRemoveMessage).mockReturnValue(fakePicker as never)

    const data = await buildWishlistAddResponse(
      'hollow knight',
      discordId,
      guildId,
      true
    )

    expect(getWishlist).toHaveBeenCalledWith(discordId)
    expect(data).toEqual(fakePicker)
  })

  it('adds the game, confirms, and includes the price embed', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    const snapshot = {
      deals: [],
      historyLowInt: 509,
      historyLowCurrency: 'USD',
    }
    vi.mocked(addGameToWishlist).mockResolvedValue({
      status: 'added',
      priceSnapshot: snapshot,
    })
    const fakeEmbed = { title: game.title } as APIEmbed
    vi.mocked(buildPriceEmbed).mockReturnValue(fakeEmbed)

    const data = await buildWishlistAddResponse(
      'hollow knight',
      discordId,
      guildId,
      true
    )

    expect(addGameToWishlist).toHaveBeenCalledWith(discordId, guildId, game)
    expect(buildPriceEmbed).toHaveBeenCalledWith(game, [], 509, 'USD')
    expect(data.content).toContain(`Added **${game.title}**`)
    expect(data.embeds).toEqual([fakeEmbed])
    expect(data.flags).toBe(MessageFlags.Ephemeral)
  })

  it('omits the Ephemeral flag when ephemeral is false', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])
    const data = await buildWishlistAddResponse('x', discordId, guildId, false)
    expect(data.flags).toBeUndefined()
  })
})
