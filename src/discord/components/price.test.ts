import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handlePriceSelect } from './price'
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

const expectUpdateMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.UpdateMessage) {
    throw new Error(`Expected UpdateMessage, got type ${result.type}`)
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

const buildSelectInteraction = (customId: string) =>
  ({ data: { custom_id: customId } }) as unknown as Parameters<
    typeof handlePriceSelect
  >[0]

beforeEach(() => vi.clearAllMocks())

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
      await handlePriceSelect(buildSelectInteraction(`price_select:${game.id}`))
    )

    expect(resolveGame).toHaveBeenCalledWith(game.id)
    expect(data.embeds).toEqual([fakeEmbed])
    expect(data.components).toEqual([])
  })

  it('reports a not-found fallback when the game no longer resolves', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = expectUpdateMessage(
      await handlePriceSelect(buildSelectInteraction(`price_select:${game.id}`))
    )

    expect(data.content).toContain("couldn't be found")
    expect(upsertGame).not.toHaveBeenCalled()
  })
})
