import { describe, it, expect } from 'vitest'
import { InteractionType, ComponentType } from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'

const GUILD_ID = 'guild-1'
const DISCORD_USER_ID = 'user-1'

const buildFeedbackInteraction = (withScreenshot: boolean) => ({
  type: InteractionType.ModalSubmit,
  token: 'interaction-token',
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  data: {
    custom_id: 'feedback_modal',
    components: [
      {
        type: ComponentType.Label,
        component: {
          type: ComponentType.StringSelect,
          custom_id: 'feedback_category',
          values: ['bug'],
        },
      },
      {
        type: ComponentType.Label,
        component: {
          type: ComponentType.TextInput,
          custom_id: 'feedback_text',
          value: 'Something broke',
        },
      },
      ...(withScreenshot
        ? [
            {
              type: ComponentType.Label,
              component: {
                type: ComponentType.FileUpload,
                custom_id: 'feedback_screenshot',
                values: ['attachment-1'],
              },
            },
          ]
        : []),
    ],
    resolved: withScreenshot
      ? {
          attachments: {
            'attachment-1': {
              url: 'https://cdn.discordapp.com/ephemeral-attachments/test/screenshot.png',
              filename: 'screenshot.png',
              content_type: 'image/png',
            },
          },
        }
      : undefined,
  },
})

describe('POST /api/interactions — /feedback modal submit (e2e)', () => {
  it('posts a text-only feedback embed and replies synchronously', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildFeedbackInteraction(false)
      )
    )
    const body = await res.json()

    expect(body.type).toBe(4) // ChannelMessageWithSource
    expect(body.data.content).toContain('Thanks')
  })

  it('falls back to the generic error response when after() has no request scope', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildFeedbackInteraction(true)
      )
    )
    const body = await res.json()

    //* Known harness limitation, not an app bug: next/server's after()
    //* depends on Next's own request-scoped AsyncLocalStorage context,
    //* which only exists when a request is dispatched through a real
    //* running Next server. Calling the route handler directly (as every
    //* e2e test here does) has no such context, so after() throws
    //* synchronously and route.ts's catch block returns its generic
    //* fallback instead of the real DeferredChannelMessageWithSource ack.
    //* The screenshot path's actual behavior is already covered by the
    //* mocked unit tests in modals/feedback.test.ts, which stub next/server
    //* entirely for exactly this reason.
    expect(body.type).toBe(4) // ChannelMessageWithSource (route's catch fallback)
    expect(body.data.content).toContain('Something went wrong')
  })

  it('replies with an ephemeral error when the feedback text is blank', async () => {
    const interaction = buildFeedbackInteraction(false)
    //* Simulate whitespace-only text — findLabelTextInputValue's trim
    //* should reduce this to an empty string and fail the validation
    //* check before any Discord post happens.
    interaction.data.components[1]!.component.value = '   '

    const res = await POST(
      buildSignedRequest('http://localhost/api/interactions', interaction)
    )
    const body = await res.json()

    expect(body.data.content).toContain('try `/feedback` again')
  })
})
