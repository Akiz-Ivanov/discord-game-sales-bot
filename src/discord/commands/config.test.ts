import { describe, it, expect, vi, beforeEach } from 'vitest'
import { config } from './config'
import { upsertGuildChannel, getGuildByGuildId } from '@/repositories/guilds'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import {
  InteractionResponseType,
  MessageFlags,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import type { APIInteractionResponse } from 'discord-api-types/v10'
import { postChannelMessage } from '@/discord/rest'

vi.mock('@/repositories/guilds', () => ({
  upsertGuildChannel: vi.fn(),
  getGuildByGuildId: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionGuildId', () => ({
  getInteractionGuildId: vi.fn(),
}))
vi.mock('@/discord/rest', () => ({ postChannelMessage: vi.fn() }))

const guildId = '999888777666555444'
const channelId = '111222333444555666'

const expectChannelMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected a ChannelMessageWithSource response, got type ${result.type}`
    )
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

const buildAlertsChannelInteraction = (channelValue: string | null) =>
  ({
    data: {
      options: [
        {
          name: 'alerts-channel',
          type: ApplicationCommandOptionType.Subcommand,
          options:
            channelValue === null
              ? []
              : [
                  {
                    name: 'channel',
                    type: ApplicationCommandOptionType.Channel,
                    value: channelValue,
                  },
                ],
        },
      ],
    },
  }) as unknown as Parameters<typeof config>[0]

const buildRemoveAlertsInteraction = () =>
  ({
    data: {
      options: [
        {
          name: 'remove-alerts',
          type: ApplicationCommandOptionType.Subcommand,
          options: [],
        },
      ],
    },
  }) as unknown as Parameters<typeof config>[0]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionGuildId).mockReturnValue(guildId)
  vi.mocked(postChannelMessage).mockResolvedValue(
    {} as Awaited<ReturnType<typeof postChannelMessage>>
  )
})

describe('config command handler — alerts-channel', () => {
  it('asks for a channel when none is provided', async () => {
    const data = expectChannelMessage(
      await config(buildAlertsChannelInteraction(null))
    )
    expect(data.content).toBe('Please provide a channel.')
    expect(upsertGuildChannel).not.toHaveBeenCalled()
  })

  it('upserts the guild channel and confirms', async () => {
    vi.mocked(upsertGuildChannel).mockResolvedValue({
      id: 1,
      guildId,
      notificationChannelId: channelId,
      createdAt: new Date(),
    })

    const data = expectChannelMessage(
      await config(buildAlertsChannelInteraction(channelId))
    )

    expect(upsertGuildChannel).toHaveBeenCalledWith(guildId, channelId)
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    expect(data.content).toContain(`<#${channelId}>`)
  })

  it('posts the welcome card to the newly configured channel', async () => {
    vi.mocked(upsertGuildChannel).mockResolvedValue({
      id: 1,
      guildId,
      notificationChannelId: channelId,
      createdAt: new Date(),
    })

    const data = expectChannelMessage(
      await config(buildAlertsChannelInteraction(channelId))
    )

    expect(postChannelMessage).toHaveBeenCalledWith(
      channelId,
      expect.anything()
    )
    expect(data.content).toContain('getting-started message')
  })

  it('still confirms the channel was set even if posting the welcome card fails', async () => {
    vi.mocked(upsertGuildChannel).mockResolvedValue({
      id: 1,
      guildId,
      notificationChannelId: channelId,
      createdAt: new Date(),
    })
    vi.mocked(postChannelMessage).mockRejectedValue(
      new Error('missing permission')
    )
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const data = expectChannelMessage(
      await config(buildAlertsChannelInteraction(channelId))
    )

    expect(upsertGuildChannel).toHaveBeenCalled()
    expect(data.content).toContain("couldn't post")
    consoleSpy.mockRestore()
  })

  it('skips reposting the welcome card when the channel is already configured', async () => {
    vi.mocked(getGuildByGuildId).mockResolvedValue({
      id: 1,
      guildId,
      notificationChannelId: channelId,
      createdAt: new Date(),
    })
    vi.mocked(upsertGuildChannel).mockResolvedValue({
      id: 1,
      guildId,
      notificationChannelId: channelId,
      createdAt: new Date(),
    })

    const data = expectChannelMessage(
      await config(buildAlertsChannelInteraction(channelId))
    )

    expect(postChannelMessage).not.toHaveBeenCalled()
    expect(data.content).toContain('already being posted')
  })

  it('still posts the welcome card when switching to a different channel', async () => {
    vi.mocked(getGuildByGuildId).mockResolvedValue({
      id: 1,
      guildId,
      notificationChannelId: 'old-channel-id',
      createdAt: new Date(),
    })
    vi.mocked(upsertGuildChannel).mockResolvedValue({
      id: 1,
      guildId,
      notificationChannelId: channelId,
      createdAt: new Date(),
    })

    const data = expectChannelMessage(
      await config(buildAlertsChannelInteraction(channelId))
    )

    expect(postChannelMessage).toHaveBeenCalledWith(
      channelId,
      expect.anything()
    )
    expect(data.content).toContain('getting-started message')
  })
})

describe('config command handler — remove-alerts', () => {
  it('reports no configuration to remove when none exists', async () => {
    vi.mocked(getGuildByGuildId).mockResolvedValue(null)

    const data = expectChannelMessage(
      await config(buildRemoveAlertsInteraction())
    )

    expect(data.content).toBe(
      "This server doesn't have any alert configuration to remove."
    )
  })

  it('replies with a confirm/cancel button row when a configuration exists', async () => {
    vi.mocked(getGuildByGuildId).mockResolvedValue({
      id: 1,
      guildId,
      notificationChannelId: channelId,
      createdAt: new Date(),
    })

    const data = expectChannelMessage(
      await config(buildRemoveAlertsInteraction())
    )

    expect(data.flags).toBe(MessageFlags.Ephemeral)
    const row = data.components?.[0]
    const buttons = row && 'components' in row ? row.components : []
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toMatchObject({
      custom_id: 'config_remove_alerts_confirm',
    })
    expect(buttons[1]).toMatchObject({
      custom_id: 'config_remove_alerts_cancel',
    })
  })
})
