import { describe, it, expect, vi, beforeEach } from 'vitest'
import { forgetMe } from './forgetMe'
import { getUserByDiscordId } from '@/repositories/users'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from 'discord-api-types/v10'

vi.mock('@/repositories/users', () => ({ getUserByDiscordId: vi.fn() }))
vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))

const discordId = '255361746758402048'

const expectChannelMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected a ChannelMessageWithSource response, got type ${result.type}`
    )
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

//* forgetMe reads nothing off the interaction directly (getInteractionUserId
//* is mocked), so an empty cast is enough — same pattern as ping.test.ts.
const fakeInteraction = {} as APIChatInputApplicationCommandInteraction

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
})

describe('forgetMe command handler', () => {
  it('replies with a no-data message when the user has no stored row', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(null)

    const data = expectChannelMessage(await forgetMe(fakeInteraction))

    expect(data.content).toBe("You don't have any stored data to delete.")
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    expect(data.components).toBeUndefined()
  })

  it('replies with a confirm/cancel button row when a user row exists', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue({
      id: 1,
      discordId,
      guildId: '999888777666555444',
      createdAt: new Date(),
    })

    const data = expectChannelMessage(await forgetMe(fakeInteraction))

    expect(data.content).toContain("can't be undone")
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    const row = data.components?.[0]
    const buttons = row && 'components' in row ? row.components : []
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toMatchObject({ custom_id: 'forget_me_confirm' })
    expect(buttons[1]).toMatchObject({ custom_id: 'forget_me_cancel' })
  })
})
