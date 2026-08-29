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
import {
  InteractionResponseType,
  MessageFlags,
  ComponentType,
} from 'discord-api-types/v10'
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
import { editOriginalInteractionResponse, postFollowupMessage } from '../rest'
import { after } from 'next/server'

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
vi.mock('../rest', () => ({
  editOriginalInteractionResponse: vi.fn(),
  postFollowupMessage: vi.fn(),
}))
vi.mock('next/server', () => ({ after: vi.fn() }))

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

  it('reports the limit-reached message with a remove picker when the wishlist is full', async () => {
    vi.mocked(getInteractionUserId).mockReturnValue(discordId)
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({ status: 'limit_reached' })
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 2, title: 'Celeste' }) }),
    ])
    vi.mocked(buildWishlistRemoveMessage).mockReturnValue({
      flags: MessageFlags.Ephemeral,
      content: 'limit reached',
      components: [
        {
          type: 1,
          components: [
            { type: 3, custom_id: 'wishlist_remove_select', options: [] },
          ],
        },
      ],
    } as never)

    const data = expectUpdateMessage(
      await handleWishlistAddSelect(
        buildComponentInteraction<typeof handleWishlistAddSelect>(
          `wishlist_add_select:${game.id}`
        )
      )
    )

    expect(data.content).toContain('limit')
    expect(data.embeds).toBeUndefined()
    const row = data.components?.[0]
    const select = row && 'components' in row ? row.components[0] : undefined
    expect(select).toMatchObject({ custom_id: 'wishlist_remove_select' })
  })
})

describe('handleWishlistItemRemove', () => {
  beforeEach(() => {
    vi.mocked(getWishlistPrices).mockResolvedValue(new Map())
    vi.mocked(editOriginalInteractionResponse).mockResolvedValue(
      {} as Awaited<ReturnType<typeof editOriginalInteractionResponse>>
    )
    vi.mocked(postFollowupMessage).mockResolvedValue(undefined)
  })

  const buildRemove = (customId: string) =>
    buildComponentInteraction<typeof handleWishlistItemRemove>(customId, {
      token: 'interaction-token',
    })

  const getDeferredCallback = () =>
    vi.mocked(after).mock.calls[0]![0] as () => Promise<void>

  it('immediately returns a deferred ack without doing any work synchronously', async () => {
    const result = await handleWishlistItemRemove(
      buildRemove('wishlist_item_remove:5:2')
    )

    expect(result.type).toBe(InteractionResponseType.DeferredMessageUpdate)
    expect(removeGameFromWishlist).not.toHaveBeenCalled()
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('removes the game, edits the list first, then posts a removal confirmation', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({
        game: makeGameRow({ id: 5, itadId: 'itad-5', title: 'Hollow Knight' }),
      }),
    ])
    vi.mocked(removeGameFromWishlist).mockResolvedValue({ status: 'removed' })
    const fakeMessage = { flags: 0, components: [] }
    vi.mocked(buildWishlistListMessage).mockReturnValue(fakeMessage as never)

    await handleWishlistItemRemove(buildRemove('wishlist_item_remove:5:2'))
    await getDeferredCallback()()

    expect(removeGameFromWishlist).toHaveBeenCalledWith(userRow.id, 5)
    expect(getWishlistPrices).toHaveBeenCalledWith([])
    expect(buildWishlistListMessage).toHaveBeenCalledWith([], new Map(), 2)

    //* Edit must land before the follow-up — the list update is what the
    //* user is watching, the confirmation is secondary.
    const editOrder = vi.mocked(editOriginalInteractionResponse).mock
      .invocationCallOrder[0]!
    const followupOrder =
      vi.mocked(postFollowupMessage).mock.invocationCallOrder[0]!
    expect(editOrder).toBeLessThan(followupOrder)

    expect(editOriginalInteractionResponse).toHaveBeenCalledWith(
      'interaction-token',
      fakeMessage
    )
    expect(postFollowupMessage).toHaveBeenCalledWith('interaction-token', {
      flags: MessageFlags.Ephemeral,
      content: '✅ Removed **Hollow Knight**',
    })
  })

  it('defaults to page 0 when the custom_id has no page segment', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 5, itadId: 'itad-5' }) }),
    ])
    vi.mocked(removeGameFromWishlist).mockResolvedValue({ status: 'removed' })
    vi.mocked(buildWishlistListMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    await handleWishlistItemRemove(buildRemove('wishlist_item_remove:5'))
    await getDeferredCallback()()

    expect(buildWishlistListMessage).toHaveBeenCalledWith([], new Map(), 0)
  })

  it('edits the list without posting a confirmation on a stale double-click', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 5, itadId: 'itad-5' }) }),
    ])
    //* Already removed by an earlier click — this one finds nothing to
    //* delete, so no confirmation should claim credit for it.
    vi.mocked(removeGameFromWishlist).mockResolvedValue({ status: 'not_found' })
    vi.mocked(buildWishlistListMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    await handleWishlistItemRemove(buildRemove('wishlist_item_remove:5:0'))
    await getDeferredCallback()()

    expect(editOriginalInteractionResponse).toHaveBeenCalled()
    expect(postFollowupMessage).not.toHaveBeenCalled()
  })

  it('edits with a components-v2 fallback without removing anything when no user row exists', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(null)

    await handleWishlistItemRemove(buildRemove('wishlist_item_remove:5'))
    await getDeferredCallback()()

    expect(removeGameFromWishlist).not.toHaveBeenCalled()
    expect(editOriginalInteractionResponse).toHaveBeenCalledWith(
      'interaction-token',
      expect.objectContaining({
        flags: MessageFlags.IsComponentsV2,
        components: [
          { type: ComponentType.TextDisplay, content: 'Something went wrong.' },
        ],
      })
    )
    expect(postFollowupMessage).not.toHaveBeenCalled()
  })

  it('edits with an error message if the deferred work throws', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockRejectedValue(new Error('DB connection lost'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await handleWishlistItemRemove(buildRemove('wishlist_item_remove:5'))
    await getDeferredCallback()()

    expect(editOriginalInteractionResponse).toHaveBeenCalledWith(
      'interaction-token',
      expect.objectContaining({
        content: expect.stringContaining('Something went wrong'),
      })
    )
    consoleSpy.mockRestore()
  })

  it('still edits the list even when the confirmation follow-up post fails', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 5, itadId: 'itad-5' }) }),
    ])
    vi.mocked(removeGameFromWishlist).mockResolvedValue({ status: 'removed' })
    vi.mocked(postFollowupMessage).mockRejectedValue(new Error('webhook down'))
    const fakeMessage = { flags: 0, components: [] }
    vi.mocked(buildWishlistListMessage).mockReturnValue(fakeMessage as never)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await handleWishlistItemRemove(buildRemove('wishlist_item_remove:5'))
    await getDeferredCallback()()

    expect(editOriginalInteractionResponse).toHaveBeenCalledWith(
      'interaction-token',
      fakeMessage
    )
    consoleSpy.mockRestore()
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
