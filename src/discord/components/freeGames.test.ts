// src/discord/components/freeGames.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleFreeGamesPage, handleFreeGamesPageRich } from './freeGames'
import { getSortedFreeGames } from '@/services/freeGames'
import { InteractionResponseType } from 'discord-api-types/v10'
import { makeGiveaway } from '@/test/factories'

vi.mock('@/services/freeGames', () => ({ getSortedFreeGames: vi.fn() }))

const buildInteraction = (customId: string) =>
  ({ data: { custom_id: customId } }) as unknown as Parameters<
    typeof handleFreeGamesPage
  >[0]

beforeEach(() => vi.clearAllMocks())

describe('handleFreeGamesPage', () => {
  it('re-fetches live giveaways and renders the requested page', async () => {
    vi.mocked(getSortedFreeGames).mockResolvedValue([makeGiveaway()])

    const result = await handleFreeGamesPage(
      buildInteraction('free_games_page:1')
    )

    expect(getSortedFreeGames).toHaveBeenCalled()
    expect(result.type).toBe(InteractionResponseType.UpdateMessage)
  })
})

describe('handleFreeGamesPageRich', () => {
  it('re-fetches live giveaways and renders the requested page in rich mode', async () => {
    vi.mocked(getSortedFreeGames).mockResolvedValue([makeGiveaway()])

    const result = await handleFreeGamesPageRich(
      buildInteraction('free_games_page_rich:1')
    )

    expect(getSortedFreeGames).toHaveBeenCalled()
    expect(result.type).toBe(InteractionResponseType.UpdateMessage)
  })
})
