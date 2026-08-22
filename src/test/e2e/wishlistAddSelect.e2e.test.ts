import { describe, it, expect } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { http, HttpResponse } from 'msw'
import { InteractionType, ComponentType } from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'
import { server } from '@/test/e2e/setup'
import { db } from '@/db'
import { games, users, wishlistItems } from '@/db/schema'
import infoFixture from '@/test/e2e/fixtures/itad/info-hollow-knight.json'
import { WISHLIST_LIMIT } from '@/lib/constants'

const HOLLOW_KNIGHT_ITAD_ID = '018d937f-1ae9-734c-ba47-bd357cf07edd'
const GUILD_ID = 'guild-1'
const DISCORD_USER_ID = 'user-1'

const buildAddSelectInteraction = () => ({
  type: InteractionType.MessageComponent,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  message: { id: 'msg-1', embeds: [] },
  data: {
    custom_id: `wishlist_add_select:${HOLLOW_KNIGHT_ITAD_ID}`,
    component_type: ComponentType.Button,
  },
})

describe('POST /api/interactions — wishlist_add_select click (e2e)', () => {
  it('adds the chosen game, writes a wishlist_items row, and shows the price embed', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/info/v2', () =>
        HttpResponse.json(infoFixture)
      )
    )

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildAddSelectInteraction()
      )
    )
    const body = await res.json()

    expect(body.data.content).toContain('Added **Hollow Knight**')
    expect(body.data.embeds[0].title).toBe('Hollow Knight')

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.discordId, DISCORD_USER_ID))
    const [gameRow] = await db
      .select()
      .from(games)
      .where(eq(games.itadId, HOLLOW_KNIGHT_ITAD_ID))
    const [wishlistRow] = await db
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.userId, userRow!.id),
          eq(wishlistItems.gameId, gameRow!.id)
        )
      )

    expect(wishlistRow).toBeDefined()
    //* Fixture's cheapest deal (Humble Store) is 749 with cut: 50 — an
    //* on-sale add seeds lastNotifiedPrice so the cron doesn't
    //* immediately re-alert for a deal the user just saw seconds ago.
    expect(wishlistRow!.lastNotifiedPrice).toBe(749)
  })

  it('reports already-on-wishlist without adding a duplicate row', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/info/v2', () =>
        HttpResponse.json(infoFixture)
      )
    )

    const [userRow] = await db
      .insert(users)
      .values({ discordId: DISCORD_USER_ID, guildId: GUILD_ID })
      .returning()
    const [gameRow] = await db
      .insert(games)
      .values({
        itadId: HOLLOW_KNIGHT_ITAD_ID,
        slug: 'hollow-knight',
        title: 'Hollow Knight',
      })
      .returning()
    await db
      .insert(wishlistItems)
      .values({ userId: userRow!.id, gameId: gameRow!.id })

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildAddSelectInteraction()
      )
    )
    const body = await res.json()

    expect(body.data.content).toContain('already on your wishlist')
    expect(body.data.embeds).toBeUndefined()

    const rows = await db.select().from(wishlistItems)
    expect(rows).toHaveLength(1)
  })

  it('shows the limit-reached remove picker instead of adding past WISHLIST_LIMIT', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/info/v2', () =>
        HttpResponse.json(infoFixture)
      )
    )

    const [userRow] = await db
      .insert(users)
      .values({ discordId: DISCORD_USER_ID, guildId: GUILD_ID })
      .returning()

    //* Seed WISHLIST_LIMIT distinct games already on the wishlist —
    //* countWishlistItems' check in addGameToWishlist should reject a
    //* 101st add before ever calling getGamePrices for it.
    const existingGames = await db
      .insert(games)
      .values(
        Array.from({ length: WISHLIST_LIMIT }, (_, i) => ({
          itadId: crypto.randomUUID(),
          slug: `filler-game-${i}`,
          title: `Filler Game ${i}`,
        }))
      )
      .returning()

    await db
      .insert(wishlistItems)
      .values(existingGames.map((g) => ({ userId: userRow!.id, gameId: g.id })))

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildAddSelectInteraction()
      )
    )
    const body = await res.json()

    //* buildWishlistRemoveMessage's limit-reached content override —
    //* confirms the remove-picker path fired, not a normal add-success.
    expect(body.data.content).toContain(`${WISHLIST_LIMIT}-game limit`)
    const row = body.data.components?.[0]
    const select = row && 'components' in row ? row.components[0] : undefined
    expect(select).toMatchObject({ custom_id: 'wishlist_remove_select' })

    //* Confirms the reject actually happened before the DB write —
    //* Hollow Knight should NOT be among the wishlisted games.
    const finalCount = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userRow!.id))
    expect(finalCount).toHaveLength(WISHLIST_LIMIT)
  })
})
