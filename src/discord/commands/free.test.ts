import { describe, it, expect, vi, beforeEach } from 'vitest'
import { free } from './free'
import { getSortedFreeGames } from '@/services/freeGames'
import { buildFreeGamesMessage } from '@/discord/views/freeGames'
import { editOriginalInteractionResponse } from '@/discord/rest'
import { after } from 'next/server'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10'

vi.mock('@/services/freeGames', () => ({ getSortedFreeGames: vi.fn() }))
vi.mock('@/discord/views/freeGames', () => ({ buildFreeGamesMessage: vi.fn() }))
vi.mock('@/discord/rest', () => ({ editOriginalInteractionResponse: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))

const fakeInteraction = {
  token: 'interaction-token',
} as APIChatInputApplicationCommandInteraction

const getDeferredCallback = () =>
  vi.mocked(after).mock.calls[0]![0] as () => Promise<void>

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(editOriginalInteractionResponse).mockResolvedValue(
    {} as Awaited<ReturnType<typeof editOriginalInteractionResponse>>
  )
})

describe('free command handler', () => {
  it('immediately returns a deferred ack without fetching synchronously', async () => {
    const result = await free(fakeInteraction)

    expect(result.type).toBe(
      InteractionResponseType.DeferredChannelMessageWithSource
    )
    if (
      result.type !== InteractionResponseType.DeferredChannelMessageWithSource
    )
      return
    expect(result.data?.flags).toBe(MessageFlags.Ephemeral)
    expect(getSortedFreeGames).not.toHaveBeenCalled()
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('fetches giveaways and edits the original response once resolved', async () => {
    vi.mocked(getSortedFreeGames).mockResolvedValue([{ id: 1 } as never])
    vi.mocked(buildFreeGamesMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    await free(fakeInteraction)
    await getDeferredCallback()()

    expect(buildFreeGamesMessage).toHaveBeenCalledWith([{ id: 1 }], 0, true)
    expect(editOriginalInteractionResponse).toHaveBeenCalledWith(
      'interaction-token',
      { flags: 0, components: [] }
    )
  })

  it('edits with an error message if the deferred fetch throws', async () => {
    vi.mocked(getSortedFreeGames).mockRejectedValue(
      new Error('GamerPower down')
    )
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await free(fakeInteraction)
    await getDeferredCallback()()

    expect(editOriginalInteractionResponse).toHaveBeenCalledWith(
      'interaction-token',
      expect.objectContaining({
        content: expect.stringContaining('Something went wrong'),
      })
    )
    consoleSpy.mockRestore()
  })
})
