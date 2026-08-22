import { describe, it, expect } from 'vitest'
import { InteractionType, ComponentType } from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'

const GUILD_ID = 'guild-1'
const DISCORD_USER_ID = 'user-1'

const buildFreeInteraction = () => ({
  type: InteractionType.ApplicationCommand,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  data: { name: 'free', options: [] },
})

describe('POST /api/interactions — /free (e2e)', () => {
  it('renders the rich, ephemeral, thumbnail-mode giveaway list', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildFreeInteraction()
      )
    )
    const body = await res.json()

    expect(body.type).toBe(4) // ChannelMessageWithSource
    expect(body.data.flags & 64).toBe(64) // Ephemeral

    const container = body.data.components[0]
    const sections = container.components.filter(
      (c: { type: number }) => c.type === ComponentType.Section
    )
    //* Rich mode = Section + Thumbnail accessory per entry, distinct
    //* from the cron's lean plain-TextDisplay mode.
    expect(sections.length).toBeGreaterThan(0)
    expect(sections[0].accessory.type).toBe(ComponentType.Thumbnail)
  })
})
