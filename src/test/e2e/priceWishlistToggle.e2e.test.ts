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

const HOLLOW_KNIGHT_ITAD_ID = '018d937f-1ae9-734c-ba47-bd357cf07edd'
const GUILD_ID = 'guild-1'
const DISCORD_USER_ID = 'user-1'

const EXISTING_EMBED = {
  title: 'Hollow Knight',
  fields: [{ name: 'stale', value: 'stale' }],
}

const buildToggleInteraction = () => ({
  type: InteractionType.MessageComponent,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  message: { id: 'msg-1', embeds: [EXISTING_EMBED] },
  data: {
    custom_id: `price_wishlist_toggle:${HOLLOW_KNIGHT_ITAD_ID}`,
    component_type: ComponentType.Button,
  },
})

describe('POST /api/interactions — price_wishlist_toggle click (e2e)', () => {
  it('adds the game to the wishlist and flips the button to Remove, reusing the existing embed', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/info/v2', () =>
        HttpResponse.json(infoFixture)
      )
    )

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildToggleInteraction()
      )
    )
    const body = await res.json()

    //* Proves the "reuse interaction.message.embeds instead of
    //* re-fetching" optimization actually preserves the exact embed
    //* that was already on the message — not a freshly re-fetched one.
    expect(body.data.embeds).toEqual([EXISTING_EMBED])

    const buttons = body.data.components[0].components
    expect(buttons[0].label).toBe('➖ Remove from wishlist')

    const [gameRow] = await db
      .select()
      .from(games)
      .where(eq(games.itadId, HOLLOW_KNIGHT_ITAD_ID))
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.discordId, DISCORD_USER_ID))
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
  })

  it('removes the game from the wishlist and flips the button to Add, reusing the existing embed', async () => {
    server.use(
      http.get('https://api.isthereanydeal.com/games/info/v2', () =>
        HttpResponse.json(infoFixture)
      )
    )

    //* Pre-seed as already-wishlisted — handlePriceWishlistToggle's
    //* remove branch calls getUserByDiscordId (a plain lookup, not an
    //* upsert), so a users row has to exist beforehand or it throws.
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
        buildToggleInteraction()
      )
    )
    const body = await res.json()

    expect(body.data.embeds).toEqual([EXISTING_EMBED])

    const buttons = body.data.components[0].components
    expect(buttons[0].label).toBe('➕ Add to wishlist')

    const remaining = await db
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.userId, userRow!.id),
          eq(wishlistItems.gameId, gameRow!.id)
        )
      )
    expect(remaining).toHaveLength(0)
  })
})
