import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleShowBundles } from './bundles'
import { resolveGame } from '@/services/games'
import { getBundlesForGame } from '@/itad/client'
import { buildBundlesMessage } from '@/discord/views/bundles'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { APIInteractionResponse } from 'discord-api-types/v10'
import { game, buildComponentInteraction } from '@/test/factories'

vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/itad/client', () => ({ getBundlesForGame: vi.fn() }))
vi.mock('@/discord/views/bundles', () => ({ buildBundlesMessage: vi.fn() }))

const expectChannelMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected ChannelMessageWithSource, got type ${result.type}`
    )
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

beforeEach(() => vi.clearAllMocks())

describe('handleShowBundles', () => {
  it('resolves the game, fetches bundles, and renders the bundles message', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(getBundlesForGame).mockResolvedValue([])
    const fakeMessage = {
      flags: MessageFlags.Ephemeral,
      embeds: [{ title: 'fake' }],
    }
    vi.mocked(buildBundlesMessage).mockReturnValue(fakeMessage as never)

    const data = expectChannelMessage(
      await handleShowBundles(
        buildComponentInteraction<typeof handleShowBundles>(
          `price_bundles:${game.id}`
        )
      )
    )

    expect(resolveGame).toHaveBeenCalledWith(game.id)
    expect(getBundlesForGame).toHaveBeenCalledWith(game.id)
    expect(buildBundlesMessage).toHaveBeenCalledWith([], game.title)
    expect(data).toEqual(fakeMessage)
  })

  it('replies with a not-found fallback when the game no longer resolves', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = expectChannelMessage(
      await handleShowBundles(
        buildComponentInteraction<typeof handleShowBundles>(
          `price_bundles:${game.id}`
        )
      )
    )

    expect(data.content).toContain("couldn't be found")
    expect(getBundlesForGame).not.toHaveBeenCalled()
    expect(buildBundlesMessage).not.toHaveBeenCalled()
  })
})
