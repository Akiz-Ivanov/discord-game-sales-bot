import { describe, it, expect, vi, beforeEach } from 'vitest'
import { price } from './price'
import { buildPriceLookupResponse } from '@/discord/interactions/buildPriceLookupResponse'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIInteractionResponse } from 'discord-api-types/v10'

vi.mock('@/discord/interactions/buildPriceLookupResponse', () => ({
  buildPriceLookupResponse: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))

const discordId = '255361746758402048'
const guildId = '999888777666555444'

const buildInteraction = (query: string | null, guildId_?: string | null) =>
  ({
    guild_id: guildId_ === undefined ? guildId : (guildId_ ?? undefined),
    data: {
      options: query === null ? [] : [{ name: 'game', type: 3, value: query }],
    },
  }) as Parameters<typeof price>[0]

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
    expect(buildPriceLookupResponse).not.toHaveBeenCalled()
  })

  it('delegates to buildPriceLookupResponse with discordId/guildId when in a guild', async () => {
    vi.mocked(buildPriceLookupResponse).mockResolvedValue({
      content: 'fake response',
    })

    const data = expectChannelMessage(
      await price(buildInteraction('hollow knight'))
    )

    expect(buildPriceLookupResponse).toHaveBeenCalledWith(
      'hollow knight',
      discordId,
      guildId,
      false
    )
    expect(data).toEqual({ content: 'fake response' })
  })

  it('delegates with discordId/guildId both undefined in a DM', async () => {
    vi.mocked(buildPriceLookupResponse).mockResolvedValue({
      content: 'fake response',
    })

    await price(buildInteraction('hollow knight', null))

    expect(buildPriceLookupResponse).toHaveBeenCalledWith(
      'hollow knight',
      undefined,
      undefined,
      false
    )
    expect(getInteractionUserId).not.toHaveBeenCalled()
  })
})
