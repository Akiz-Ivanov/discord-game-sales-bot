import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleWishlistRemoveSelect, handleWishlistAddSelect } from './wishlist'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { getUserByDiscordId } from '@/repositories/users'
import {
  getWishlist,
  removeGameFromWishlist,
  addGameToWishlist,
} from '@/services/wishlist'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIInteractionResponse } from 'discord-api-types/v10'
import { game, makeGameRow } from '@/test/factories'
import { resolveGame } from '@/services/games'

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

const buildSelectInteraction = (value: string) =>
  ({
    data: { custom_id: 'wishlist_remove_select', values: [value] },
  }) as unknown as Parameters<typeof handleWishlistRemoveSelect>[0]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
  vi.mocked(getInteractionGuildId).mockReturnValue(guildId)
})

describe('handleWishlistRemoveSelect', () => {
  it('removes the selected game and confirms with its title', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([
      { game: makeGameRow({ id: 2, title: 'Hollow Knight' }) },
    ])
    vi.mocked(removeGameFromWishlist).mockResolvedValue({ status: 'removed' })

    const data = expectUpdateMessage(
      await handleWishlistRemoveSelect(buildSelectInteraction('2'))
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
      await handleWishlistRemoveSelect(buildSelectInteraction('2'))
    )

    expect(data.content).toContain('already off your wishlist')
  })

  it('returns a fallback message without calling removeGameFromWishlist when no user row exists', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(null)

    const data = expectUpdateMessage(
      await handleWishlistRemoveSelect(buildSelectInteraction('2'))
    )

    expect(removeGameFromWishlist).not.toHaveBeenCalled()
    expect(data.content).toContain('Something went wrong')
  })
})

const buildButtonInteraction = (customId: string) =>
  ({ data: { custom_id: customId } }) as unknown as Parameters<
    typeof handleWishlistAddSelect
  >[0]

describe('handleWishlistAddSelect', () => {
  it('adds the chosen game and confirms', async () => {
    vi.mocked(getInteractionUserId).mockReturnValue(discordId)
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({ status: 'added' })

    const data = expectUpdateMessage(
      await handleWishlistAddSelect(
        buildButtonInteraction(`wishlist_add_select:${game.id}`)
      )
    )

    expect(resolveGame).toHaveBeenCalledWith(game.id)
    expect(addGameToWishlist).toHaveBeenCalledWith(discordId, guildId, game)
    expect(data.content).toContain(`Added **${game.title}**`)
    expect(data.components).toEqual([])
  })

  it('reports already-on-wishlist for a duplicate add', async () => {
    vi.mocked(getInteractionUserId).mockReturnValue(discordId)
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({ status: 'already_exists' })

    const data = expectUpdateMessage(
      await handleWishlistAddSelect(
        buildButtonInteraction(`wishlist_add_select:${game.id}`)
      )
    )

    expect(data.content).toContain('already on your wishlist')
  })

  it('reports a not-found fallback when the game no longer resolves', async () => {
    vi.mocked(getInteractionUserId).mockReturnValue(discordId)
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = expectUpdateMessage(
      await handleWishlistAddSelect(
        buildButtonInteraction(`wishlist_add_select:${game.id}`)
      )
    )

    expect(data.content).toContain("couldn't be found")
    expect(addGameToWishlist).not.toHaveBeenCalled()
  })
})
