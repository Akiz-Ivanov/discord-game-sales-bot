import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleBundlesListPage } from './bundlesList'
import { getBundlesList } from '@/itad/client'
import { buildBundlesListMessage } from '@/discord/views/bundlesList'
import { InteractionResponseType } from 'discord-api-types/v10'
import { buildComponentInteraction } from '@/test/factories'

vi.mock('@/itad/client', () => ({ getBundlesList: vi.fn() }))
vi.mock('@/discord/views/bundlesList', () => ({
  buildBundlesListMessage: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())

describe('handleBundlesListPage', () => {
  it('re-fetches the bundle list and renders the requested page', async () => {
    vi.mocked(getBundlesList).mockResolvedValue([{ id: 1 } as never])
    vi.mocked(buildBundlesListMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    const result = await handleBundlesListPage(
      buildComponentInteraction<typeof handleBundlesListPage>('bundles_page:1')
    )

    expect(getBundlesList).toHaveBeenCalled()
    expect(buildBundlesListMessage).toHaveBeenCalledWith([{ id: 1 }], 1)
    expect(result.type).toBe(InteractionResponseType.UpdateMessage)
  })
})
