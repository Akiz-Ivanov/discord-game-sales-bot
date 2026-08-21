import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleFeedbackModalSubmit } from './feedback'
import {
  postChannelMessage,
  postChannelMessageWithFile,
  editOriginalInteractionResponse,
} from '@/discord/rest'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { after } from 'next/server'
import {
  InteractionResponseType,
  ComponentType,
  MessageFlags,
} from 'discord-api-types/v10'
import type { APIModalSubmitInteraction } from 'discord-api-types/v10'

vi.mock('@/discord/rest', () => ({
  postChannelMessage: vi.fn(),
  postChannelMessageWithFile: vi.fn(),
  editOriginalInteractionResponse: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))
vi.mock('next/server', () => ({ after: vi.fn() }))

const discordId = '255361746758402048'
const guildId = '999888777666555444'
const feedbackChannelId = '111222333444555666'

const buildLabel = (customId: string, component: Record<string, unknown>) => ({
  type: ComponentType.Label,
  component: { custom_id: customId, ...component },
})

const buildInteraction = ({
  category = 'bug',
  text = 'Something broke',
  withScreenshot = false,
  guildId: gId = guildId,
}: {
  category?: string | null
  text?: string | null
  withScreenshot?: boolean
  guildId?: string | null
} = {}) => {
  const components = []
  if (category !== null) {
    components.push(
      buildLabel('feedback_category', {
        type: ComponentType.StringSelect,
        values: [category],
      })
    )
  }
  if (text !== null) {
    components.push(
      buildLabel('feedback_text', {
        type: ComponentType.TextInput,
        value: text,
      })
    )
  }
  if (withScreenshot) {
    components.push(
      buildLabel('feedback_screenshot', {
        type: ComponentType.FileUpload,
        values: ['attachment-1'],
      })
    )
  }

  return {
    token: 'interaction-token',
    guild_id: gId ?? undefined,
    data: {
      custom_id: 'feedback_modal',
      components,
      resolved: withScreenshot
        ? {
            attachments: {
              'attachment-1': {
                url: 'https://cdn.discordapp.com/ephemeral-attachments/fake.png',
                filename: 'screenshot.png',
                content_type: 'image/png',
              },
            },
          }
        : undefined,
    },
  } as unknown as APIModalSubmitInteraction
}

const expectChannelMessage = (
  result: Awaited<ReturnType<typeof handleFeedbackModalSubmit>>
) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected ChannelMessageWithSource, got type ${result.type}`
    )
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
  vi.stubEnv('FEEDBACK_CHANNEL_ID', feedbackChannelId)
  vi.mocked(postChannelMessage).mockResolvedValue(
    {} as Awaited<ReturnType<typeof postChannelMessage>>
  )
  vi.mocked(postChannelMessageWithFile).mockResolvedValue(
    {} as Awaited<ReturnType<typeof postChannelMessageWithFile>>
  )
  vi.mocked(editOriginalInteractionResponse).mockResolvedValue(
    {} as Awaited<ReturnType<typeof editOriginalInteractionResponse>>
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('handleFeedbackModalSubmit — validation', () => {
  it('replies with an ephemeral error when the category is missing', async () => {
    const data = expectChannelMessage(
      await handleFeedbackModalSubmit(buildInteraction({ category: null }))
    )
    expect(data.content).toContain('Something went wrong')
    expect(postChannelMessage).not.toHaveBeenCalled()
  })

  it('replies with an ephemeral error when the feedback text is empty after trimming', async () => {
    const data = expectChannelMessage(
      await handleFeedbackModalSubmit(buildInteraction({ text: '   ' }))
    )
    expect(data.content).toContain('Something went wrong')
    expect(postChannelMessage).not.toHaveBeenCalled()
  })

  it('replies with an ephemeral error when FEEDBACK_CHANNEL_ID is unset', async () => {
    vi.unstubAllEnvs()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const data = expectChannelMessage(
      await handleFeedbackModalSubmit(buildInteraction())
    )

    expect(data.content).toContain("couldn't be delivered")
    expect(postChannelMessage).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('handleFeedbackModalSubmit — no screenshot', () => {
  it('posts a plain embed and replies with a synchronous thank-you', async () => {
    const data = expectChannelMessage(
      await handleFeedbackModalSubmit(buildInteraction())
    )

    expect(postChannelMessage).toHaveBeenCalledWith(
      feedbackChannelId,
      expect.objectContaining({
        embeds: [
          expect.objectContaining({
            title: '🐛 Report a bug',
            description: expect.stringContaining(`<@${discordId}>`),
            footer: { text: `${discordId} · guild ${guildId}` },
          }),
        ],
      })
    )
    expect(data.content).toContain('Thanks')
    expect(after).not.toHaveBeenCalled()
  })

  it('labels the footer origin as DM when there is no guild_id', async () => {
    await handleFeedbackModalSubmit(buildInteraction({ guildId: null }))

    expect(postChannelMessage).toHaveBeenCalledWith(
      feedbackChannelId,
      expect.objectContaining({
        embeds: [
          expect.objectContaining({ footer: { text: `${discordId} · DM` } }),
        ],
      })
    )
  })
})

describe('handleFeedbackModalSubmit — with screenshot', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const getDeferredCallback = () =>
    vi.mocked(after).mock.calls[0]![0] as () => Promise<void>

  it('immediately returns a deferred ack without posting synchronously', async () => {
    const result = await handleFeedbackModalSubmit(
      buildInteraction({ withScreenshot: true })
    )

    expect(result.type).toBe(
      InteractionResponseType.DeferredChannelMessageWithSource
    )
    if (
      result.type !== InteractionResponseType.DeferredChannelMessageWithSource
    )
      return
    expect(result.data?.flags).toBe(MessageFlags.Ephemeral)
    expect(postChannelMessage).not.toHaveBeenCalled()
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('fetches the attachment, re-uploads it, and edits the original response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    } as Response)

    await handleFeedbackModalSubmit(buildInteraction({ withScreenshot: true }))
    await getDeferredCallback()()

    expect(postChannelMessageWithFile).toHaveBeenCalledWith(
      feedbackChannelId,
      expect.objectContaining({
        embeds: [
          expect.objectContaining({
            image: { url: 'attachment://screenshot.png' },
          }),
        ],
      }),
      expect.objectContaining({
        filename: 'screenshot.png',
        contentType: 'image/png',
      })
    )
    expect(editOriginalInteractionResponse).toHaveBeenCalledWith(
      'interaction-token',
      expect.objectContaining({ content: expect.stringContaining('Thanks') })
    )
  })

  it('falls back to a text-only post when the attachment fetch fails, but still confirms success', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await handleFeedbackModalSubmit(buildInteraction({ withScreenshot: true }))
    await getDeferredCallback()()

    expect(postChannelMessageWithFile).not.toHaveBeenCalled()
    expect(postChannelMessage).toHaveBeenCalledWith(
      feedbackChannelId,
      expect.objectContaining({
        embeds: [expect.not.objectContaining({ image: expect.anything() })],
      })
    )
    expect(editOriginalInteractionResponse).toHaveBeenCalledWith(
      'interaction-token',
      expect.objectContaining({ content: expect.stringContaining('Thanks') })
    )
    consoleSpy.mockRestore()
  })

  it('edits the original response with an error message if the deferred work throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await handleFeedbackModalSubmit(buildInteraction({ withScreenshot: true }))
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
