import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bundlesList } from './bundlesList'
import { getBundlesList } from '@/itad/client'
import { buildBundlesListMessage } from '@/discord/views/bundlesList'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10'

vi.mock('@/itad/client', () => ({ getBundlesList: vi.fn() }))
vi.mock('@/discord/views/bundlesList', () => ({
  buildBundlesListMessage: vi.fn(),
}))

const fakeInteraction = {} as APIChatInputApplicationCommandInteraction

beforeEach(() => vi.clearAllMocks())

describe('bundlesList command handler', () => {
  it('fetches the bundle list and renders page 0', async () => {
    vi.mocked(getBundlesList).mockResolvedValue([{ id: 1 } as never])
    vi.mocked(buildBundlesListMessage).mockReturnValue({
      flags: 0,
      components: [],
    } as never)

    const result = await bundlesList(fakeInteraction)

    expect(result.type).toBe(InteractionResponseType.ChannelMessageWithSource)
    expect(buildBundlesListMessage).toHaveBeenCalledWith([{ id: 1 }], 0)
  })
})
