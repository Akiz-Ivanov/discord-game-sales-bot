import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import {
  InteractionType,
  ApplicationCommandOptionType,
  ComponentType,
} from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'
import { server } from '@/test/e2e/setup'

const GUILD_ID = 'guild-1'
const DISCORD_USER_ID = 'user-1'
const CHANNEL_ID = 'channel-1'

const buildAlertsChannelInteraction = () => ({
  type: InteractionType.ApplicationCommand,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  data: {
    name: 'config',
    options: [
      {
        name: 'alerts-channel',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            value: CHANNEL_ID,
          },
        ],
      },
    ],
  },
})

const buildWelcomeButtonInteraction = (customId: string) => ({
  type: InteractionType.MessageComponent,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  message: { id: 'welcome-msg' },
  data: { custom_id: customId, component_type: ComponentType.Button },
})

describe('POST /api/interactions — /config alerts-channel welcome card (e2e)', () => {
  it('posts a real Components V2 welcome card with the rich header and utility row', async () => {
    let postedBody: unknown
    server.use(
      http.post(
        'https://discord.com/api/v10/channels/:channelId/messages',
        async ({ request }) => {
          postedBody = await request.json()
          return HttpResponse.json({ id: 'welcome-msg-id' })
        }
      )
    )

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildAlertsChannelInteraction()
      )
    )
    const body = await res.json()

    expect(body.data.content).toContain('getting-started message')

    const posted = postedBody as {
      components: { type: number; components?: unknown[] }[]
    }
    //* Container + separate utility ActionRow — the rich (non-ephemeral)
    //* variant, since this posts to a real channel, not back to the user.
    expect(posted.components).toHaveLength(2)
    const container = posted.components[0] as {
      components: { content?: string }[]
    }
    expect(container.components[0]?.content).toContain('Game Sales Bot')
  })
})

describe('POST /api/interactions — welcome card button clicks (e2e)', () => {
  it('welcome_check_price opens the price-check modal', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildWelcomeButtonInteraction('welcome_check_price')
      )
    )
    const body = await res.json()

    expect(body.type).toBe(9) // Modal
    expect(body.data.custom_id).toBe('welcome_price_modal')
  })

  it('welcome_add_game opens the add-to-wishlist modal', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildWelcomeButtonInteraction('welcome_add_game')
      )
    )
    const body = await res.json()

    expect(body.type).toBe(9) // Modal
    expect(body.data.custom_id).toBe('welcome_add_modal')
  })

  it('welcome_my_wishlist offers an Add a game button when the wishlist is empty', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildWelcomeButtonInteraction('welcome_my_wishlist')
      )
    )
    const body = await res.json()

    expect(body.data.content).toContain('empty')
    const row = body.data.components?.[0]
    const button = row && 'components' in row ? row.components[0] : undefined
    expect(button).toMatchObject({ custom_id: 'welcome_add_game' })
  })

  it('welcome_free_games renders the rich giveaway list', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildWelcomeButtonInteraction('welcome_free_games')
      )
    )
    const body = await res.json()

    const container = body.data.components[0]
    const sections = container.components.filter(
      (c: { type: number }) => c.type === ComponentType.Section
    )
    expect(sections.length).toBeGreaterThan(0)
    expect(sections[0].accessory.type).toBe(ComponentType.Thumbnail)
  })
})
