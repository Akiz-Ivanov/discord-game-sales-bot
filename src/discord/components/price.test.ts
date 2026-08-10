import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handlePriceSelect, handlePriceWishlistToggle } from './price'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { APIEmbed, APIInteractionResponse } from 'discord-api-types/v10'
import {
  game,
  makeGameRow,
  buildComponentInteraction,
  makeWishlistItemRow,
} from '@/test/factories'
import { getUserByDiscordId } from '@/repositories/users'
import {
  addGameToWishlist,
  removeGameFromWishlist,
  isGameWishlisted,
  getWishlist,
} from '@/services/wishlist'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'

vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/services/prices', () => ({ getGamePrices: vi.fn() }))
vi.mock('@/repositories/games', () => ({ upsertGame: vi.fn() }))
vi.mock('@/discord/embeds/price', () => ({ buildPriceEmbed: vi.fn() }))
vi.mock('@/repositories/users', () => ({ getUserByDiscordId: vi.fn() }))
vi.mock('@/services/wishlist', () => ({
  addGameToWishlist: vi.fn(),
  removeGameFromWishlist: vi.fn(),
  isGameWishlisted: vi.fn(),
  getWishlist: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionGuildId', () => ({
  getInteractionGuildId: vi.fn(),
}))

const expectUpdateMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.UpdateMessage) {
    throw new Error(`Expected UpdateMessage, got type ${result.type}`)
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

const discordId = '255361746758402048'
const guildId = '999888777666555444'
const userRow = { id: 1, discordId, guildId, createdAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
  vi.mocked(getInteractionGuildId).mockReturnValue(guildId)
})

describe('handlePriceSelect', () => {
  it('re-resolves the chosen game and shows its price embed', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue({ id: 1 } as Awaited<
      ReturnType<typeof upsertGame>
    >)
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
    const fakeEmbed = { title: game.title } as APIEmbed
    vi.mocked(buildPriceEmbed).mockReturnValue(fakeEmbed)

    const data = expectUpdateMessage(
      await handlePriceSelect(
        buildComponentInteraction<typeof handlePriceSelect>(
          `price_select:${game.id}`
        )
      )
    )

    expect(resolveGame).toHaveBeenCalledWith(game.id)
    expect(data.embeds).toEqual([fakeEmbed])
    expect(data.components).toEqual([])
  })

  it('reports a not-found fallback when the game no longer resolves', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = expectUpdateMessage(
      await handlePriceSelect(
        buildComponentInteraction<typeof handlePriceSelect>(
          `price_select:${game.id}`
        )
      )
    )

    expect(data.content).toContain("couldn't be found")
    expect(upsertGame).not.toHaveBeenCalled()
  })
})

describe('handlePriceWishlistToggle', () => {
  const buildToggle = (customId: string) =>
    buildComponentInteraction<typeof handlePriceWishlistToggle>(customId, {
      guild_id: guildId,
      message: { embeds: [{ title: 'Hollow Knight' } as APIEmbed] },
    })

  it('adds the game and flips the button to Remove when not previously wishlisted', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue(makeGameRow({ id: 1 }))
    vi.mocked(isGameWishlisted).mockResolvedValue(false)
    vi.mocked(addGameToWishlist).mockResolvedValue({
      status: 'added',
      priceSnapshot: {
        deals: [],
        historyLowInt: undefined,
        historyLowCurrency: undefined,
      },
    })

    const data = expectUpdateMessage(
      await handlePriceWishlistToggle(
        buildToggle(`price_wishlist_toggle:${game.id}`)
      )
    )

    expect(addGameToWishlist).toHaveBeenCalledWith(discordId, guildId, game)
    expect(removeGameFromWishlist).not.toHaveBeenCalled()
    expect(getGamePrices).not.toHaveBeenCalled() //* reuses the message's own embeds now
    expect(data.embeds).toEqual([{ title: 'Hollow Knight' }])
    const row = data.components?.[0]
    const button = row && 'components' in row ? row.components[0] : undefined
    expect(button).toMatchObject({ label: '➖ Remove from wishlist' })
  })

  it('removes the game and flips the button to Add when previously wishlisted', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue(makeGameRow({ id: 1 }))
    vi.mocked(isGameWishlisted).mockResolvedValue(true)
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(removeGameFromWishlist).mockResolvedValue({ status: 'removed' })

    const data = expectUpdateMessage(
      await handlePriceWishlistToggle(
        buildToggle(`price_wishlist_toggle:${game.id}`)
      )
    )

    expect(removeGameFromWishlist).toHaveBeenCalledWith(userRow.id, 1)
    expect(addGameToWishlist).not.toHaveBeenCalled()
    expect(getGamePrices).not.toHaveBeenCalled() //* reuses the message's own embeds now
    expect(data.embeds).toEqual([{ title: 'Hollow Knight' }])
    const row = data.components?.[0]
    const button = row && 'components' in row ? row.components[0] : undefined
    expect(button).toMatchObject({ label: '➕ Add to wishlist' })
  })

  it('replies with an ephemeral remove picker as a new message, leaving the original embed untouched', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue(makeGameRow({ id: 1 }))
    vi.mocked(isGameWishlisted).mockResolvedValue(false)
    vi.mocked(addGameToWishlist).mockResolvedValue({ status: 'limit_reached' })
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 2, title: 'Celeste' }) }),
    ])

    const result = await handlePriceWishlistToggle(
      buildToggle(`price_wishlist_toggle:${game.id}`)
    )

    expect(result.type).toBe(InteractionResponseType.ChannelMessageWithSource)
    if (result.type !== InteractionResponseType.ChannelMessageWithSource) return
    expect(result.data?.content).toContain('limit')
    expect(result.data?.flags).toBe(MessageFlags.Ephemeral)
    expect(getGamePrices).not.toHaveBeenCalled()
  })

  it('reports a not-found fallback when the game no longer resolves', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = expectUpdateMessage(
      await handlePriceWishlistToggle(
        buildToggle(`price_wishlist_toggle:${game.id}`)
      )
    )

    expect(data.content).toContain("couldn't be found")
    expect(isGameWishlisted).not.toHaveBeenCalled()
  })
})
