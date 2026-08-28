import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trending } from './trending'
import { getTrendingDeals } from '@/itad/client'
import { buildTrendingMessage } from '@/discord/views/trending'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10'

vi.mock('@/itad/client', () => ({ getTrendingDeals: vi.fn() }))
vi.mock('@/discord/views/trending', () => ({ buildTrendingMessage: vi.fn() }))

const fakeInteraction = {} as APIChatInputApplicationCommandInteraction

beforeEach(() => vi.clearAllMocks())

describe('trending command handler', () => {
  it('fetches trending deals and renders page 0', async () => {
    vi.mocked(getTrendingDeals).mockResolvedValue([{ id: 1 } as never])
    vi.mocked(buildTrendingMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    const result = await trending(fakeInteraction)

    expect(result.type).toBe(InteractionResponseType.ChannelMessageWithSource)
    expect(buildTrendingMessage).toHaveBeenCalledWith([{ id: 1 }], 0)
  })
})
