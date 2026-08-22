import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { http, HttpResponse } from 'msw'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'
import { server } from '@/test/e2e/setup'
import { db } from '@/db'
import { games, prices } from '@/db/schema'
import {
  InteractionType,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import wildHuntSearchFixture from '@/test/e2e/fixtures/itad/search-wild-hunt.json'

const HOLLOW_KNIGHT_ITAD_ID = '018d937f-1ae9-734c-ba47-bd357cf07edd'

const buildPriceInteraction = (query: string) => ({
  type: InteractionType.ApplicationCommand,
  guild_id: 'guild-1',
  member: { user: { id: 'user-1' } },
  data: {
    name: 'price',
    options: [
      {
        name: 'game',
        type: ApplicationCommandOptionType.String,
        value: query,
      },
    ],
  },
})

describe('POST /api/interactions — /price (e2e)', () => {
  it('resolves a real single match through the full stack and writes games + prices rows', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildPriceInteraction('hollow knight')
      )
    )
    const body = await res.json()

    expect(body.data.embeds[0].title).toBe('Hollow Knight')

    //* Confirms upsertGame() actually wrote through to real Postgres,
    //* not just that the HTTP response looked right.
    const [gameRow] = await db
      .select()
      .from(games)
      .where(eq(games.itadId, HOLLOW_KNIGHT_ITAD_ID))
    expect(gameRow).toBeDefined()

    //* Confirms savePrices()/savePricesBulk() wrote every deal from the
    //* ITAD response into the prices table, not just the cheapest one.
    const priceRows = await db
      .select()
      .from(prices)
      .where(eq(prices.gameId, gameRow!.id))
    expect(priceRows).toHaveLength(4)
    expect(priceRows.some((p) => p.shopName === 'GOG')).toBe(true)
  })

  it('offers a disambiguation picker on multiple matches, without writing to the DB', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/search/v1', () =>
        HttpResponse.json(wildHuntSearchFixture)
      )
    )

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildPriceInteraction('wild hunt')
      )
    )
    const body = await res.json()

    expect(body.data.content).toBe('Multiple games found — pick one:')
    const buttons = body.data.components[0].components
    //* dlc entry filtered out — only game + package survive resolveGame
    expect(buttons).toHaveLength(2)
    expect(
      buttons.some(
        (b: { label: string }) => b.label === 'The Witcher 3: Wild Hunt'
      )
    ).toBe(true)

    const gameRows = await db.select().from(games)
    expect(gameRows).toHaveLength(0)
  })

  it('reports no match found for a nonsense query, without writing to the DB', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/search/v1', () =>
        HttpResponse.json([])
      )
    )

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildPriceInteraction('asdkfjhaslkdjfh')
      )
    )
    const body = await res.json()

    expect(body.data.content).toContain("Couldn't find a game matching")

    const gameRows = await db.select().from(games)
    expect(gameRows).toHaveLength(0)
  })
})
