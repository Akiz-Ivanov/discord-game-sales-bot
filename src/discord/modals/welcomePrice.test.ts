import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleWelcomePriceModalSubmit } from './welcomePrice'
import { buildPriceLookupResponse } from '@/discord/interactions/buildPriceLookupResponse'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import {
  InteractionResponseType,
  MessageFlags,
  ComponentType,
} from 'discord-api-types/v10'
import type { APIModalSubmitInteraction } from 'discord-api-types/v10'

vi.mock('@/discord/interactions/buildPriceLookupResponse', () => ({
  buildPriceLookupResponse: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionGuildId', () => ({
  getInteractionGuildId: vi.fn(),
}))

const discordId = '255361746758402048'
const guildId = '999888777666555444'

const buildInteraction = (query: string | null) =>
  ({
    data: {
      custom_id: 'welcome_price_modal',
      components:
        query === null
          ? []
          : [
              {
                type: ComponentType.Label,
                component: {
                  type: ComponentType.TextInput,
                  custom_id: 'welcome_price_query',
                  value: query,
                },
              },
            ],
    },
  }) as unknown as APIModalSubmitInteraction

const expectChannelMessage = (
  result: Awaited<ReturnType<typeof handleWelcomePriceModalSubmit>>
) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected ChannelMessageWithSource, got type ${result.type}`
    )
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
  vi.mocked(getInteractionGuildId).mockReturnValue(guildId)
})

describe('handleWelcomePriceModalSubmit', () => {
  it('prompts for a query when the text input is empty after trimming', async () => {
    const data = expectChannelMessage(
      await handleWelcomePriceModalSubmit(buildInteraction('   '))
    )
    expect(data.content).toBe('Please enter a game to look up.')
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    expect(buildPriceLookupResponse).not.toHaveBeenCalled()
  })

  it('prompts for a query when the component is missing entirely', async () => {
    const data = expectChannelMessage(
      await handleWelcomePriceModalSubmit(buildInteraction(null))
    )
    expect(data.content).toBe('Please enter a game to look up.')
    expect(buildPriceLookupResponse).not.toHaveBeenCalled()
  })

  it('delegates to buildPriceLookupResponse as an ephemeral, guild-scoped lookup', async () => {
    vi.mocked(buildPriceLookupResponse).mockResolvedValue({
      content: 'fake response',
    })

    const data = expectChannelMessage(
      await handleWelcomePriceModalSubmit(buildInteraction('hollow knight'))
    )

    expect(buildPriceLookupResponse).toHaveBeenCalledWith(
      'hollow knight',
      discordId,
      guildId,
      true
    )
    expect(data).toEqual({ content: 'fake response' })
  })
})
