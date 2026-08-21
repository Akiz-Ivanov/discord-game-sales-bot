import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'
import { db } from '@/db'
import { games, prices } from '@/db/schema'
import {
  InteractionType,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'

const HOLLOW_KNIGHT_ITAD_ID = '018d937f-1ae9-734c-ba47-bd357cf07edd'

describe('POST /api/interactions — /price (e2e)', () => {
  it('resolves a real single match through the full stack and writes games + prices rows', async () => {
    const interaction = {
      type: InteractionType.ApplicationCommand,
      guild_id: 'guild-1',
      member: { user: { id: 'user-1' } },
      data: {
        name: 'price',
        options: [
          {
            name: 'game',
            type: ApplicationCommandOptionType.String,
            value: 'hollow knight',
          },
        ],
      },
    }

    const res = await POST(
      buildSignedRequest('http://localhost/api/interactions', interaction)
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
})
