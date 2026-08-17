import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleWelcomeMyWishlist,
  handleWelcomeFreeGames,
  handleWelcomeCheckPrice,
  handleWelcomeHelp,
  handleWelcomeFeedback,
  handleWelcomeAddGame,
} from './welcome'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getWishlist } from '@/services/wishlist'
import { getWishlistPrices } from '@/services/prices'
import { buildWishlistListMessage } from '@/discord/views/wishlistList'
import { getSortedFreeGames } from '@/services/freeGames'
import { buildFreeGamesMessage } from '@/discord/views/freeGames'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import {
  buildComponentInteraction,
  makeGameRow,
  makeWishlistItemRow,
  makeGiveaway,
} from '@/test/factories'

vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))
vi.mock('@/services/wishlist', () => ({ getWishlist: vi.fn() }))
vi.mock('@/services/prices', () => ({ getWishlistPrices: vi.fn() }))
vi.mock('@/discord/views/wishlistList', () => ({
  buildWishlistListMessage: vi.fn(),
}))
vi.mock('@/services/freeGames', () => ({ getSortedFreeGames: vi.fn() }))
vi.mock('@/discord/views/freeGames', () => ({ buildFreeGamesMessage: vi.fn() }))

const discordId = '255361746758402048'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
})

describe('handleWelcomeMyWishlist', () => {
  it('offers an Add a game button (opens the add modal) when the wishlist is empty', async () => {
    vi.mocked(getWishlist).mockResolvedValue([])

    const result = await handleWelcomeMyWishlist(
      buildComponentInteraction<typeof handleWelcomeMyWishlist>(
        'welcome_my_wishlist'
      )
    )

    if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
      throw new Error(
        `Expected ChannelMessageWithSource, got type ${result.type}`
      )
    }
    expect(result.data?.content).toContain('empty')
    expect(result.data?.flags).toBe(MessageFlags.Ephemeral)
    expect(getWishlistPrices).not.toHaveBeenCalled()

    const row = result.data?.components?.[0]
    const button = row && 'components' in row ? row.components[0] : undefined
    expect(button).toMatchObject({ custom_id: 'welcome_add_game' })
  })

  it('fetches prices and renders the wishlist list for a non-empty wishlist', async () => {
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 1, itadId: 'itad-1' }) }),
    ])
    vi.mocked(getWishlistPrices).mockResolvedValue(new Map())
    const fakeMessage = { flags: 0, components: [] }
    vi.mocked(buildWishlistListMessage).mockReturnValue(fakeMessage as never)

    const result = await handleWelcomeMyWishlist(
      buildComponentInteraction<typeof handleWelcomeMyWishlist>(
        'welcome_my_wishlist'
      )
    )

    expect(getWishlistPrices).toHaveBeenCalledWith([
      { gameDbId: 1, itadId: 'itad-1' },
    ])
    if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
      throw new Error(
        `Expected ChannelMessageWithSource, got type ${result.type}`
      )
    }
    expect(result.data).toEqual(fakeMessage)
  })
})

describe('handleWelcomeFreeGames', () => {
  it('fetches giveaways and renders the rich free-games message', async () => {
    vi.mocked(getSortedFreeGames).mockResolvedValue([makeGiveaway()])
    const fakeMessage = { flags: 0, components: [] }
    vi.mocked(buildFreeGamesMessage).mockReturnValue(fakeMessage as never)

    const result = await handleWelcomeFreeGames(
      buildComponentInteraction<typeof handleWelcomeFreeGames>(
        'welcome_free_games'
      )
    )

    expect(buildFreeGamesMessage).toHaveBeenCalledWith(
      [expect.anything()],
      0,
      true
    )
    if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
      throw new Error(
        `Expected ChannelMessageWithSource, got type ${result.type}`
      )
    }
    expect(result.data).toEqual(fakeMessage)
  })
})

describe('handleWelcomeCheckPrice', () => {
  it('opens the price-check modal', async () => {
    const result = await handleWelcomeCheckPrice(
      buildComponentInteraction<typeof handleWelcomeCheckPrice>(
        'welcome_check_price'
      )
    )
    expect(result.type).toBe(InteractionResponseType.Modal)
    if (result.type !== InteractionResponseType.Modal) return
    expect(result.data?.custom_id).toBe('welcome_price_modal')
  })
})

describe('handleWelcomeHelp', () => {
  it('replies with the help message', async () => {
    const result = await handleWelcomeHelp(
      buildComponentInteraction<typeof handleWelcomeHelp>('welcome_help')
    )
    expect(result.type).toBe(InteractionResponseType.ChannelMessageWithSource)
    if (result.type !== InteractionResponseType.ChannelMessageWithSource) return
    expect(result.data?.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
  })
})

describe('handleWelcomeFeedback', () => {
  it('opens the feedback modal', async () => {
    const result = await handleWelcomeFeedback(
      buildComponentInteraction<typeof handleWelcomeFeedback>(
        'welcome_feedback'
      )
    )
    expect(result.type).toBe(InteractionResponseType.Modal)
    if (result.type !== InteractionResponseType.Modal) return
    expect(result.data?.custom_id).toBe('feedback_modal')
  })
})

describe('handleWelcomeAddGame', () => {
  it('opens the add-to-wishlist modal', async () => {
    const result = await handleWelcomeAddGame(
      buildComponentInteraction<typeof handleWelcomeAddGame>('welcome_add_game')
    )
    expect(result.type).toBe(InteractionResponseType.Modal)
    if (result.type !== InteractionResponseType.Modal) return
    expect(result.data?.custom_id).toBe('welcome_add_modal')
  })
})
