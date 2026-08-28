import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleTrendingPage } from './trending'
import { getTrendingDeals } from '@/itad/client'
import { buildTrendingMessage } from '@/discord/views/trending'
import { InteractionResponseType } from 'discord-api-types/v10'
import { buildComponentInteraction } from '@/test/factories'

vi.mock('@/itad/client', () => ({ getTrendingDeals: vi.fn() }))
vi.mock('@/discord/views/trending', () => ({ buildTrendingMessage: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('handleTrendingPage', () => {
  it('re-fetches trending deals and renders the requested page', async () => {
    vi.mocked(getTrendingDeals).mockResolvedValue([{ id: 1 } as never])
    vi.mocked(buildTrendingMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    const result = await handleTrendingPage(
      buildComponentInteraction<typeof handleTrendingPage>('trending_page:1')
    )

    expect(getTrendingDeals).toHaveBeenCalled()
    expect(buildTrendingMessage).toHaveBeenCalledWith([{ id: 1 }], 1)
    expect(result.type).toBe(InteractionResponseType.UpdateMessage)
  })
})
