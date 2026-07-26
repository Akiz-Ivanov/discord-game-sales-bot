import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleWishlistRemoveSelect } from './wishlist'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getUserByDiscordId } from '@/repositories/users'
import { getWishlist, removeGameFromWishlist } from '@/services/wishlist'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIInteractionResponse } from 'discord-api-types/v10'
import { makeGameRow } from '@/test/factories'

vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))
vi.mock('@/repositories/users', () => ({ getUserByDiscordId: vi.fn() }))
vi.mock('@/services/wishlist', () => ({
  getWishlist: vi.fn(),
  removeGameFromWishlist: vi.fn(),
}))

const discordId = '255361746758402048'
const userRow = { id: 1, discordId, createdAt: new Date() }

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
