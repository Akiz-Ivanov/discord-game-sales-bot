import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGameSearchAutocomplete } from './gameSearch'
import { searchGamesByTitle } from '@/itad/client'
import { InteractionResponseType } from 'discord-api-types/v10'
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIInteractionResponse,
} from 'discord-api-types/v10'
import { game } from '@/test/factories'

vi.mock('@/itad/client', () => ({ searchGamesByTitle: vi.fn() }))

const buildInteraction = (query: string) =>
  ({
    data: { options: [{ name: 'game', value: query, focused: true }] },
  }) as unknown as APIApplicationCommandAutocompleteInteraction

const expectAutocompleteResult = (result: APIInteractionResponse) => {
  if (
    result.type !== InteractionResponseType.ApplicationCommandAutocompleteResult
  ) {
    throw new Error(
      `Expected an ApplicationCommandAutocompleteResult, got type ${result.type}`
    )
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

beforeEach(() => vi.clearAllMocks())

describe('handleGameSearchAutocomplete', () => {
  it('returns no choices without calling ITAD below the minimum query length', async () => {
    const data = expectAutocompleteResult(
      await handleGameSearchAutocomplete(buildInteraction('ho'))
    )
    expect(data.choices).toEqual([])
    expect(searchGamesByTitle).not.toHaveBeenCalled()
  })

  it('searches ITAD and maps matches to name/value choices', async () => {
    vi.mocked(searchGamesByTitle).mockResolvedValue([game])

    const data = expectAutocompleteResult(
      await handleGameSearchAutocomplete(buildInteraction('hollow'))
    )

    expect(searchGamesByTitle).toHaveBeenCalledWith('hollow')
    expect(data.choices).toEqual([{ name: game.title, value: game.id }])
  })

  it('caps choices at 25', async () => {
    const matches = Array.from({ length: 30 }, (_, i) => ({
      ...game,
      id: `id-${i}`,
      title: `Game ${i}`,
    }))
    vi.mocked(searchGamesByTitle).mockResolvedValue(matches)

    const data = expectAutocompleteResult(
      await handleGameSearchAutocomplete(buildInteraction('game'))
    )
    expect(data.choices).toHaveLength(25)
  })

  it('truncates a choice name longer than 100 characters', async () => {
    vi.mocked(searchGamesByTitle).mockResolvedValue([
      { ...game, title: 'A'.repeat(150) },
    ])

    const data = expectAutocompleteResult(
      await handleGameSearchAutocomplete(buildInteraction('aaaaa'))
    )
    expect(data.choices?.[0]?.name).toHaveLength(100)
  })

  it('returns no choices instead of throwing when ITAD errors', async () => {
    vi.mocked(searchGamesByTitle).mockRejectedValue(new Error('ITAD down'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const data = expectAutocompleteResult(
      await handleGameSearchAutocomplete(buildInteraction('hollow'))
    )
    expect(data.choices).toEqual([])
    consoleSpy.mockRestore()
  })
})
