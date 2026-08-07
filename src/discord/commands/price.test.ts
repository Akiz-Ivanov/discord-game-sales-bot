import { describe, it, expect, vi, beforeEach } from 'vitest'
import { price } from './price'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { InteractionResponseType, ComponentType } from 'discord-api-types/v10'
import type { APIEmbed, APIInteractionResponse } from 'discord-api-types/v10'
import { game, makeGameRow } from '@/test/factories'
import { isGameWishlisted } from '@/services/wishlist'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'

vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/services/prices', () => ({ getGamePrices: vi.fn() }))
vi.mock('@/repositories/games', () => ({ upsertGame: vi.fn() }))
vi.mock('@/discord/embeds/price', () => ({ buildPriceEmbed: vi.fn() }))
vi.mock('@/services/wishlist', () => ({ isGameWishlisted: vi.fn() }))
vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))

const discordId = '255361746758402048'
const guildId = '999888777666555444'

//* Minimal fake interaction — only the `data.options` shape price.ts reads.
const buildInteraction = (query: string | null, guildId_?: string | null) =>
  ({
    guild_id: guildId_ === undefined ? guildId : (guildId_ ?? undefined),
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
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
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

  it('offers candidates as buttons (capped at 5) when multiple matches are found', async () => {
    const matches = Array.from({ length: 7 }, (_, i) => ({
      ...game,
      id: `id-${i}`,
      title: `Game ${i}`,
    }))
    vi.mocked(resolveGame).mockResolvedValue(matches)

    const data = expectChannelMessage(await price(buildInteraction('game')))

    expect(data.content).toContain('Multiple games found')
    const row = data.components?.[0]
    const buttons = row && 'components' in row ? row.components : []
    expect(buttons).toHaveLength(5)
    expect(buttons[0]).toMatchObject({
      type: ComponentType.Button,
      label: 'Game 0',
      custom_id: 'price_select:id-0',
    })
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

    const data = expectChannelMessage(
      await price(buildInteraction('hollow knight'))
    )

    expect(upsertGame).toHaveBeenCalledWith(game)
    expect(getGamePrices).toHaveBeenCalledWith(1, game.id)
    expect(buildPriceEmbed).toHaveBeenCalledWith(game, [], 509, 'USD')
    expect(isGameWishlisted).toHaveBeenCalledWith(discordId, 1)
    expect(data.embeds).toEqual([fakeEmbed])
    const row = data.components?.[0]
    const button = row && 'components' in row ? row.components[0] : undefined
    expect(button).toMatchObject({
      custom_id: `price_wishlist_toggle:${game.id}`,
      label: '➕ Add to wishlist',
    })
  })

  it('shows a Remove button when the game is already wishlisted', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue(makeGameRow({ id: 1 }))
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
    vi.mocked(isGameWishlisted).mockResolvedValue(true)
    vi.mocked(buildPriceEmbed).mockReturnValue({} as APIEmbed)

    const data = expectChannelMessage(
      await price(buildInteraction('hollow knight'))
    )

    const row = data.components?.[0]
    const button = row && 'components' in row ? row.components[0] : undefined
    expect(button).toMatchObject({ label: '➖ Remove from wishlist' })
  })

  it('omits the wishlist button entirely in a DM (no guild_id)', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(upsertGame).mockResolvedValue(makeGameRow({ id: 1 }))
    vi.mocked(getGamePrices).mockResolvedValue({
      deals: [],
      historyLowInt: undefined,
      historyLowCurrency: undefined,
    })
    vi.mocked(buildPriceEmbed).mockReturnValue({} as APIEmbed)

    const data = expectChannelMessage(
      await price(buildInteraction('hollow knight', null))
    )

    expect(data.components).toBeUndefined()
    expect(isGameWishlisted).not.toHaveBeenCalled()
  })
})
