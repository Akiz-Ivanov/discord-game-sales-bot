import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  handleWishlistRemoveSelect,
  handleWishlistAddSelect,
  handleWishlistItemRemove,
  handleWishlistListPage,
} from './wishlist'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { getUserByDiscordId } from '@/repositories/users'
import {
  getWishlist,
  removeGameFromWishlist,
  addGameToWishlist,
} from '@/services/wishlist'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { APIInteractionResponse, APIEmbed } from 'discord-api-types/v10'
import {
  game,
  makeGameRow,
  makeWishlistItemRow,
  buildComponentInteraction,
} from '@/test/factories'
import { resolveGame } from '@/services/games'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { buildWishlistListMessage } from '../views/wishlistList'
import { getWishlistPrices } from '@/services/prices'
import { handleWishlistRemovePage } from './wishlist'
import { buildWishlistRemoveMessage } from '../views/wishlistRemove'

vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionGuildId', () => ({
  getInteractionGuildId: vi.fn(),
}))
vi.mock('@/repositories/users', () => ({ getUserByDiscordId: vi.fn() }))
vi.mock('@/services/wishlist', () => ({
  getWishlist: vi.fn(),
  removeGameFromWishlist: vi.fn(),
  addGameToWishlist: vi.fn(),
}))
vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/discord/embeds/price', () => ({ buildPriceEmbed: vi.fn() }))
vi.mock('@/discord/views/wishlistList', () => ({
  buildWishlistListMessage: vi.fn(),
}))
vi.mock('@/services/prices', () => ({ getWishlistPrices: vi.fn() }))
vi.mock('@/discord/views/wishlistRemove', () => ({
  buildWishlistRemoveMessage: vi.fn(),
}))

const discordId = '255361746758402048'
const guildId = '999888777666555444'
const userRow = { id: 1, discordId, guildId, createdAt: new Date() }

const expectUpdateMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.UpdateMessage) {
    throw new Error(`Expected UpdateMessage, got type ${result.type}`)
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
  vi.mocked(getInteractionGuildId).mockReturnValue(guildId)
})

describe('handleWishlistRemoveSelect', () => {
  const buildSelect = (value: string) =>
    buildComponentInteraction<typeof handleWishlistRemoveSelect>(
      'wishlist_remove_select',
      { data: { values: [value] } }
    )

  it('removes the selected game and confirms with its title', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({
        game: makeGameRow({ id: 2, title: 'Hollow Knight' }),
      }),
    ])
    vi.mocked(removeGameFromWishlist).mockResolvedValue({ status: 'removed' })

    const data = expectUpdateMessage(
      await handleWishlistRemoveSelect(buildSelect('2'))
    )

    expect(removeGameFromWishlist).toHaveBeenCalledWith(userRow.id, 2)
    expect(data.content).toContain('Removed **Hollow Knight**')
    expect(data.components).toEqual([])
  })

  it('reports already-removed for a stale selection', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([])
    vi.mocked(removeGameFromWishlist).mockResolvedValue({ status: 'not_found' })

    const data = expectUpdateMessage(
      await handleWishlistRemoveSelect(buildSelect('2'))
    )

    expect(data.content).toContain('already off your wishlist')
  })

  it('returns a fallback message without calling removeGameFromWishlist when no user row exists', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(null)

    const data = expectUpdateMessage(
      await handleWishlistRemoveSelect(buildSelect('2'))
    )

    expect(removeGameFromWishlist).not.toHaveBeenCalled()
    expect(data.content).toContain('Something went wrong')
  })
})

describe('handleWishlistAddSelect', () => {
  it('adds the chosen game, confirms, and includes the price embed', async () => {
    vi.mocked(getInteractionUserId).mockReturnValue(discordId)
    vi.mocked(resolveGame).mockResolvedValue([game])
    const snapshot = {
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    }
    vi.mocked(addGameToWishlist).mockResolvedValue({
      status: 'added',
      priceSnapshot: snapshot,
    })
    const fakeEmbed = { title: game.title } as APIEmbed
    vi.mocked(buildPriceEmbed).mockReturnValue(fakeEmbed)

    const data = expectUpdateMessage(
      await handleWishlistAddSelect(
        buildComponentInteraction<typeof handleWishlistAddSelect>(
          `wishlist_add_select:${game.id}`
        )
      )
    )

    expect(resolveGame).toHaveBeenCalledWith(game.id)
    expect(addGameToWishlist).toHaveBeenCalledWith(discordId, guildId, game)
    expect(data.content).toContain(`Added **${game.title}**`)
    expect(data.embeds).toEqual([fakeEmbed])
    expect(data.components).toEqual([])
  })

  it('reports already-on-wishlist for a duplicate add without an embed', async () => {
    vi.mocked(getInteractionUserId).mockReturnValue(discordId)
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({
      status: 'already_exists',
      priceSnapshot: {
        deals: [],
        historyLowInt: undefined,
        historyLowCurrency: undefined,
      },
    })

    const data = expectUpdateMessage(
      await handleWishlistAddSelect(
        buildComponentInteraction<typeof handleWishlistAddSelect>(
          `wishlist_add_select:${game.id}`
        )
      )
    )

    expect(data.content).toContain('already on your wishlist')
    expect(data.embeds).toBeUndefined()
  })

  it('reports a not-found fallback when the game no longer resolves', async () => {
    vi.mocked(getInteractionUserId).mockReturnValue(discordId)
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = expectUpdateMessage(
      await handleWishlistAddSelect(
        buildComponentInteraction<typeof handleWishlistAddSelect>(
          `wishlist_add_select:${game.id}`
        )
      )
    )

    expect(data.content).toContain("couldn't be found")
    expect(addGameToWishlist).not.toHaveBeenCalled()
  })

  it('reports the limit-reached message without an embed when the wishlist is full', async () => {
    vi.mocked(getInteractionUserId).mockReturnValue(discordId)
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({ status: 'limit_reached' })

    const data = expectUpdateMessage(
      await handleWishlistAddSelect(
        buildComponentInteraction<typeof handleWishlistAddSelect>(
          `wishlist_add_select:${game.id}`
        )
      )
    )

    expect(data.content).toContain('limit')
    expect(data.embeds).toBeUndefined()
    expect(data.components).toEqual([])
  })
})

describe('handleWishlistItemRemove', () => {
  beforeEach(() => {
    vi.mocked(getWishlistPrices).mockResolvedValue(new Map())
  })

  it('removes the game, re-fetches live prices, and re-renders the same page', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 5, itadId: 'itad-5' }) }),
    ])
    const fakeMessage = { flags: 0, components: [] }
    vi.mocked(buildWishlistListMessage).mockReturnValue(fakeMessage as never)

    const data = expectUpdateMessage(
      await handleWishlistItemRemove(
        buildComponentInteraction<typeof handleWishlistItemRemove>(
          'wishlist_item_remove:5:2'
        )
      )
    )

    expect(removeGameFromWishlist).toHaveBeenCalledWith(userRow.id, 5)
    expect(getWishlistPrices).toHaveBeenCalledWith([
      { gameDbId: 5, itadId: 'itad-5' },
    ])
    expect(buildWishlistListMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      2
    )
    expect(data).toEqual(fakeMessage)
  })

  it('defaults to page 0 when the custom_id has no page segment', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 5, itadId: 'itad-5' }) }),
    ])
    vi.mocked(buildWishlistListMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    await handleWishlistItemRemove(
      buildComponentInteraction<typeof handleWishlistItemRemove>(
        'wishlist_item_remove:5'
      )
    )

    expect(buildWishlistListMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      0
    )
  })

  it('returns a components-v2 fallback without removing anything when no user row exists', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(null)

    const result = await handleWishlistItemRemove(
      buildComponentInteraction<typeof handleWishlistItemRemove>(
        'wishlist_item_remove:5'
      )
    )

    expect(removeGameFromWishlist).not.toHaveBeenCalled()
    if (result.type !== InteractionResponseType.UpdateMessage) {
      throw new Error(`Expected UpdateMessage, got type ${result.type}`)
    }
    expect(result.data?.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
  })
})

describe('handleWishlistListPage', () => {
  beforeEach(() => {
    vi.mocked(getWishlistPrices).mockResolvedValue(new Map())
  })

  const buildPage = (customId: string) =>
    buildComponentInteraction<typeof handleWishlistListPage>(customId)

  it('parses the target page and re-renders without removing anything', async () => {
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 9, itadId: 'itad-9' }) }),
    ])
    const fakeMessage = { flags: 0, components: [] }
    vi.mocked(buildWishlistListMessage).mockReturnValue(fakeMessage as never)

    const data = expectUpdateMessage(
      await handleWishlistListPage(buildPage('wishlist_list_page:2'))
    )

    expect(removeGameFromWishlist).not.toHaveBeenCalled()
    expect(getWishlistPrices).toHaveBeenCalledWith([
      { gameDbId: 9, itadId: 'itad-9' },
    ])
    expect(buildWishlistListMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      2
    )
    expect(data).toEqual(fakeMessage)
  })
})

describe('handleWishlistRemovePage', () => {
  const buildPage = (customId: string) =>
    buildComponentInteraction<typeof handleWishlistRemovePage>(customId)

  it('parses the target page and re-renders the select menu', async () => {
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 9 }) }),
    ])
    const fakeMessage = { flags: 0, content: '', components: [] }
    vi.mocked(buildWishlistRemoveMessage).mockReturnValue(fakeMessage as never)

    const data = expectUpdateMessage(
      await handleWishlistRemovePage(buildPage('wishlist_remove_page:1'))
    )

    expect(buildWishlistRemoveMessage).toHaveBeenCalledWith(
      expect.anything(),
      1
    )
    expect(data).toEqual(fakeMessage)
  })
})
