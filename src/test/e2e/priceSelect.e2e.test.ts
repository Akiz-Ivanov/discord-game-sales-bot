import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { http, HttpResponse } from 'msw'
import { InteractionType, ComponentType } from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'
import { server } from '@/test/e2e/setup'
import { db } from '@/db'
import { games } from '@/db/schema'
import infoFixture from '@/test/e2e/fixtures/itad/info-hollow-knight.json'

const HOLLOW_KNIGHT_ITAD_ID = '018d937f-1ae9-734c-ba47-bd357cf07edd'

const buildPriceSelectInteraction = (guildId: string | undefined) => ({
  type: InteractionType.MessageComponent,
  guild_id: guildId,
  member: guildId ? { user: { id: 'user-1' } } : undefined,
  user: guildId ? undefined : { id: 'user-1' },
  message: { id: 'msg-1', embeds: [] },
  data: {
    custom_id: `price_select:${HOLLOW_KNIGHT_ITAD_ID}`,
    component_type: ComponentType.Button,
  },
})

describe('POST /api/interactions — price_select click (e2e)', () => {
  it('re-resolves via lookupByItadId, writes the games row, and shows enrichment fields', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/info/v2', () =>
        HttpResponse.json(infoFixture)
      )
    )

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildPriceSelectInteraction('guild-1')
      )
    )
    const body = await res.json()

    expect(body.type).toBe(7) // InteractionResponseType.UpdateMessage
    expect(body.data.embeds[0].title).toBe('Hollow Knight')

    //* Proves this went through lookupByItadId (games/info/v2), not
    //* searchGamesByTitle — the search fixture has no reviews/tags/
    //* releaseDate, so these fields only exist if the ITAD-ID branch
    //* actually fired.
    const fieldNames = body.data.embeds[0].fields.map(
      (f: { name: string }) => f.name
    )
    expect(fieldNames.some((n: string) => n.includes('Reviews'))).toBe(true)
    expect(fieldNames.some((n: string) => n.includes('Released'))).toBe(true)

    //* Toggle + bundles buttons both present in one merged row.
    const buttons = body.data.components[0].components
    expect(buttons).toHaveLength(2)
    expect(buttons[0].label).toBe('➕ Add to wishlist')
    expect(buttons[1].custom_id).toBe(`price_bundles:${HOLLOW_KNIGHT_ITAD_ID}`)

    const [gameRow] = await db
      .select()
      .from(games)
      .where(eq(games.itadId, HOLLOW_KNIGHT_ITAD_ID))
    expect(gameRow).toBeDefined()
    expect(gameRow!.title).toBe('Hollow Knight')
  })

  it('omits the wishlist toggle button in a DM, showing only bundles', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/info/v2', () =>
        HttpResponse.json(infoFixture)
      )
    )

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildPriceSelectInteraction(undefined)
      )
    )
    const body = await res.json()

    const components = body.data.components[0].components
    expect(components).toHaveLength(1)
    expect(components[0].custom_id).toBe(
      `price_bundles:${HOLLOW_KNIGHT_ITAD_ID}`
    )
  })

  it('shows a not-found fallback when the game no longer resolves', async () => {
    server.use(
      http.get(
        'https://api.isthereanydeal.com/games/info/v2',
        () => new HttpResponse(null, { status: 404 })
      )
    )

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildPriceSelectInteraction('guild-1')
      )
    )
    const body = await res.json()

    expect(body.data.content).toContain("couldn't be found")
    expect(body.data.components).toEqual([])

    const gameRows = await db.select().from(games)
    expect(gameRows).toHaveLength(0)
  })
})
