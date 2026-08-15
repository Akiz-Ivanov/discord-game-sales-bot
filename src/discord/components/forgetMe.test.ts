import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleForgetMeConfirm, handleForgetMeCancel } from './forgetMe'
import { deleteUserByDiscordId } from '@/repositories/users'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { APIInteractionResponse } from 'discord-api-types/v10'
import { buildComponentInteraction } from '@/test/factories'

vi.mock('@/repositories/users', () => ({ deleteUserByDiscordId: vi.fn() }))
vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))

const discordId = '255361746758402048'

const expectUpdateMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.UpdateMessage) {
    throw new Error(`Expected UpdateMessage, got type ${result.type}`)
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
})

describe('handleForgetMeConfirm', () => {
  it('deletes the user and confirms when a row existed', async () => {
    vi.mocked(deleteUserByDiscordId).mockResolvedValue(true)

    const data = expectUpdateMessage(
      await handleForgetMeConfirm(
        buildComponentInteraction<typeof handleForgetMeConfirm>(
          'forget_me_confirm'
        )
      )
    )

    expect(deleteUserByDiscordId).toHaveBeenCalledWith(discordId)
    expect(data.content).toContain('have been deleted')
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    expect(data.components).toEqual([])
  })

  //* Covers the double-click race: the row is already gone by the time a
  //* second click lands, so this asserts the honest no-data message rather
  //* than a false "deleted" success.
  it('reports no-data instead of a false success when the row is already gone', async () => {
    vi.mocked(deleteUserByDiscordId).mockResolvedValue(false)

    const data = expectUpdateMessage(
      await handleForgetMeConfirm(
        buildComponentInteraction<typeof handleForgetMeConfirm>(
          'forget_me_confirm'
        )
      )
    )

    expect(data.content).toBe("You don't have any stored data to delete.")
  })
})

describe('handleForgetMeCancel', () => {
  it('confirms cancellation without deleting anything', async () => {
    const data = expectUpdateMessage(
      await handleForgetMeCancel(
        buildComponentInteraction<typeof handleForgetMeCancel>(
          'forget_me_cancel'
        )
      )
    )

    expect(deleteUserByDiscordId).not.toHaveBeenCalled()
    expect(data.content).toBe('Cancelled — nothing was deleted.')
    expect(data.components).toEqual([])
  })
})
