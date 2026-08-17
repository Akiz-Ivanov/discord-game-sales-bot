import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleWelcomeAddGameModalSubmit } from './welcomeAddGame'
import { buildWishlistAddResponse } from '@/discord/interactions/buildWishlistAddResponse'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import {
  InteractionResponseType,
  MessageFlags,
  ComponentType,
} from 'discord-api-types/v10'
import type { APIModalSubmitInteraction } from 'discord-api-types/v10'

vi.mock('@/discord/interactions/buildWishlistAddResponse', () => ({
  buildWishlistAddResponse: vi.fn(),
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
      custom_id: 'welcome_add_modal',
      components:
        query === null
          ? []
          : [
              {
                type: ComponentType.Label,
                component: {
                  type: ComponentType.TextInput,
                  custom_id: 'welcome_add_query',
                  value: query,
                },
              },
            ],
    },
  }) as unknown as APIModalSubmitInteraction

const expectChannelMessage = (
  result: Awaited<ReturnType<typeof handleWelcomeAddGameModalSubmit>>
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

describe('handleWelcomeAddGameModalSubmit', () => {
  it('prompts for a query when the text input is empty after trimming', async () => {
    const data = expectChannelMessage(
      await handleWelcomeAddGameModalSubmit(buildInteraction('   '))
    )
    expect(data.content).toBe('Please enter a game to add.')
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    expect(buildWishlistAddResponse).not.toHaveBeenCalled()
  })

  it('prompts for a query when the component is missing entirely', async () => {
    const data = expectChannelMessage(
      await handleWelcomeAddGameModalSubmit(buildInteraction(null))
    )
    expect(data.content).toBe('Please enter a game to add.')
    expect(buildWishlistAddResponse).not.toHaveBeenCalled()
  })

  it('delegates to buildWishlistAddResponse as an ephemeral, guild-scoped add', async () => {
    vi.mocked(buildWishlistAddResponse).mockResolvedValue({
      content: 'fake response',
    })

    const data = expectChannelMessage(
      await handleWelcomeAddGameModalSubmit(buildInteraction('hollow knight'))
    )

    expect(buildWishlistAddResponse).toHaveBeenCalledWith(
      'hollow knight',
      discordId,
      guildId,
      true
    )
    expect(data).toEqual({ content: 'fake response' })
  })
})
