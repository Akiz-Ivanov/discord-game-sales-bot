import { describe, it, expect, vi, beforeEach } from 'vitest'
import { price } from './price'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIEmbed, APIInteractionResponse } from 'discord-api-types/v10'
import { game } from '@/test/factories'

vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/services/prices', () => ({ getGamePrices: vi.fn() }))
vi.mock('@/repositories/games', () => ({ upsertGame: vi.fn() }))
vi.mock('@/discord/embeds/price', () => ({ buildPriceEmbed: vi.fn() }))

//* Minimal fake interaction — only the `data.options` shape price.ts reads.
const buildInteraction = (query: string | null) =>
  ({
    data: {
      options: query === null ? [] : [{ name: 'game', type: 3, value: query }],
    },
  }) as Parameters<typeof price>[0]

//* Narrows the broad APIInteractionResponse union down to the one variant
//* price.ts actually returns, so `.data` (content/embeds) is safely
//* accessible. Throws with a clear message if that assumption is ever
//* wrong, rather than a confusing "data is undefined" downstream.
const expectChannelMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected a ChannelMessageWithSource response, got type ${result.type}`
    )
  }
  return result.data
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('price command handler', () => {
  it('asks for a game when no query is provided', async () => {
    const data = expectChannelMessage(await price(buildInteraction(null)))
    expect(data).toMatchObject({ content: 'Please provide a game to look up.' })
    expect(resolveGame).not.toHaveBeenCalled()
  })

  it('reports no match found', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])
    const data = expectChannelMessage(
      await price(buildInteraction('nonexistent game'))
    )
    expect(data).toMatchObject({
      content: `Couldn't find a game matching "nonexistent game".`,
    })
    expect(upsertGame).not.toHaveBeenCalled()
  })

  it('lists candidates (capped at 5) when multiple matches are found', async () => {
    const matches = Array.from({ length: 7 }, (_, i) => ({
      ...game,
      id: `id-${i}`,
      title: `Game ${i}`,
    }))
    vi.mocked(resolveGame).mockResolvedValue(matches)

    const data = expectChannelMessage(await price(buildInteraction('game')))

    expect(data.content).toContain('Multiple games found')
    expect(data.content).toContain('Game 4')
    expect(data.content).not.toContain('Game 5')
    expect(upsertGame).not.toHaveBeenCalled()
  })

  it('resolves a single match through upsert → prices → embed', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue({ id: 1 } as Awaited<
      ReturnType<typeof upsertGame>
    >)
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [],
      historyLowInt: 509,
      historyLowCurrency: 'USD',
    })
    const fakeEmbed = { title: 'Hollow Knight' } as APIEmbed
    vi.mocked(buildPriceEmbed).mockReturnValue(fakeEmbed)

    const data = expectChannelMessage(
      await price(buildInteraction('hollow knight'))
    )

    expect(upsertGame).toHaveBeenCalledWith(game)
    expect(getGamePrices).toHaveBeenCalledWith(1, game.id)
    expect(buildPriceEmbed).toHaveBeenCalledWith(game, [], 509, 'USD')
    expect(data).toEqual({ embeds: [fakeEmbed] })
  })
})
