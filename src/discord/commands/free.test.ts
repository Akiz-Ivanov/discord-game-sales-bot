import { describe, it, expect, vi, beforeEach } from 'vitest'
import { free } from './free'
import { getSortedFreeGames } from '@/services/freeGames'
import { buildFreeGamesMessage } from '@/discord/views/freeGames'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10'

vi.mock('@/services/freeGames', () => ({ getSortedFreeGames: vi.fn() }))
vi.mock('@/discord/views/freeGames', () => ({ buildFreeGamesMessage: vi.fn() }))

const fakeInteraction = {} as APIChatInputApplicationCommandInteraction

beforeEach(() => vi.clearAllMocks())

describe('free command handler', () => {
  it('fetches giveaways and renders the rich, ephemeral message', async () => {
    vi.mocked(getSortedFreeGames).mockResolvedValue([{ id: 1 } as never])
    vi.mocked(buildFreeGamesMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    const result = await free(fakeInteraction)

    expect(result.type).toBe(InteractionResponseType.ChannelMessageWithSource)
    expect(buildFreeGamesMessage).toHaveBeenCalledWith([{ id: 1 }], 0, true)
  })
})
