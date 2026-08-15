import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleRemoveAlertsConfirm, handleRemoveAlertsCancel } from './config'
import { deleteGuildByGuildId } from '@/repositories/guilds'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { APIInteractionResponse } from 'discord-api-types/v10'
import { buildComponentInteraction } from '@/test/factories'

vi.mock('@/repositories/guilds', () => ({ deleteGuildByGuildId: vi.fn() }))
vi.mock('@/discord/interactions/getInteractionGuildId', () => ({
  getInteractionGuildId: vi.fn(),
}))

const guildId = '999888777666555444'

const expectUpdateMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.UpdateMessage) {
    throw new Error(`Expected UpdateMessage, got type ${result.type}`)
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionGuildId).mockReturnValue(guildId)
})

describe('handleRemoveAlertsConfirm', () => {
  it('deletes the guild config and confirms when a row existed', async () => {
    vi.mocked(deleteGuildByGuildId).mockResolvedValue(true)

    const data = expectUpdateMessage(
      await handleRemoveAlertsConfirm(
        buildComponentInteraction<typeof handleRemoveAlertsConfirm>(
          'config_remove_alerts_confirm'
        )
      )
    )

    expect(deleteGuildByGuildId).toHaveBeenCalledWith(guildId)
    expect(data.content).toContain('has been removed')
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    expect(data.components).toEqual([])
  })

  //* Covers the double-click race: config already gone by the time a
  //* second click lands, so this asserts the honest no-config message
  //* rather than a false "removed" success.
  it('reports no-config instead of a false success when the row is already gone', async () => {
    vi.mocked(deleteGuildByGuildId).mockResolvedValue(false)

    const data = expectUpdateMessage(
      await handleRemoveAlertsConfirm(
        buildComponentInteraction<typeof handleRemoveAlertsConfirm>(
          'config_remove_alerts_confirm'
        )
      )
    )

    expect(data.content).toBe(
      "This server doesn't have any alert configuration to remove."
    )
  })
})

describe('handleRemoveAlertsCancel', () => {
  it('confirms cancellation without deleting anything', async () => {
    const data = expectUpdateMessage(
      await handleRemoveAlertsCancel(
        buildComponentInteraction<typeof handleRemoveAlertsCancel>(
          'config_remove_alerts_cancel'
        )
      )
    )

    expect(deleteGuildByGuildId).not.toHaveBeenCalled()
    expect(data.content).toBe('Cancelled — nothing was changed.')
    expect(data.components).toEqual([])
  })
})
