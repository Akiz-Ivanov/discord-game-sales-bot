import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleSaleAlertCheckPrice } from './saleAlert'
import { resolveGame } from '@/services/games'
import { getGamePrices } from '@/services/prices'
import { upsertGame } from '@/repositories/games'
import { buildPriceEmbed } from '@/discord/embeds/price'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { APIEmbed, APIInteractionResponse } from 'discord-api-types/v10'
import { game } from '@/test/factories'

vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/services/prices', () => ({ getGamePrices: vi.fn() }))
vi.mock('@/repositories/games', () => ({ upsertGame: vi.fn() }))
vi.mock('@/discord/embeds/price', () => ({ buildPriceEmbed: vi.fn() }))

const expectChannelMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected ChannelMessageWithSource, got type ${result.type}`
    )
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

const buildInteraction = (customId: string) =>
  ({ data: { custom_id: customId } }) as unknown as Parameters<
    typeof handleSaleAlertCheckPrice
  >[0]

beforeEach(() => vi.clearAllMocks())

describe('handleSaleAlertCheckPrice', () => {
  it('resolves the game and replies with an ephemeral price embed', async () => {
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

    const data = expectChannelMessage(
      await handleSaleAlertCheckPrice(
        buildInteraction(`sale_check_price:${game.id}`)
      )
    )

    expect(resolveGame).toHaveBeenCalledWith(game.id)
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    expect(data.embeds).toEqual([fakeEmbed])
  })

  it('replies with a not-found fallback when the game no longer resolves', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])

    const data = expectChannelMessage(
      await handleSaleAlertCheckPrice(
        buildInteraction(`sale_check_price:${game.id}`)
      )
    )

    expect(data.content).toContain("couldn't be found")
    expect(upsertGame).not.toHaveBeenCalled()
  })
})
