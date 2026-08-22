import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { InteractionType, ComponentType } from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'
import { db } from '@/db'
import { games, users, wishlistItems } from '@/db/schema'
import { server } from '@/test/e2e/setup'
import { http, HttpResponse } from 'msw'
import infoFixture from '@/test/e2e/fixtures/itad/prices-hollow-knight.json'

const HOLLOW_KNIGHT_ITAD_ID = '018d937f-1ae9-734c-ba47-bd357cf07edd'
const GUILD_ID = 'guild-1'
const DISCORD_USER_ID = 'user-1'

const buildItemRemoveInteraction = (gameId: number, page = 0) => ({
  type: InteractionType.MessageComponent,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  message: { id: 'msg-1' },
  data: {
    custom_id: `wishlist_item_remove:${gameId}:${page}`,
    component_type: ComponentType.Button,
  },
})

const buildRemoveSelectInteraction = (gameId: string) => ({
  type: InteractionType.MessageComponent,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  message: { id: 'msg-1' },
  data: {
    custom_id: 'wishlist_remove_select',
    component_type: ComponentType.StringSelect,
    values: [gameId],
  },
})

const seedWishlistedGame = async () => {
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

  return { userRow, gameRow }
}

describe('POST /api/interactions — wishlist_remove_select click (e2e)', () => {
  it('removes the selected game and confirms with its title', async () => {
    const { userRow, gameRow } = await seedWishlistedGame()

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildRemoveSelectInteraction(String(gameRow!.id))
      )
    )
    const body = await res.json()

    expect(body.data.content).toBe(
      '✅ Removed **Hollow Knight** from your wishlist.'
    )
    expect(body.data.components).toEqual([])

    const remaining = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userRow!.id))
    expect(remaining).toHaveLength(0)
  })

  it('reports already-removed for a stale selection', async () => {
    const [userRow] = await db
      .insert(users)
      .values({ discordId: DISCORD_USER_ID, guildId: GUILD_ID })
      .returning()

    //* User row exists (so getUserByDiscordId succeeds) but no wishlist
    //* item for this gameId — simulates clicking a select option after
    //* the item was already removed some other way.
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildRemoveSelectInteraction('99999')
      )
    )
    const body = await res.json()

    expect(body.data.content).toBe(
      "That game's already off your wishlist — nothing to remove."
    )

    void userRow
  })
})

describe('POST /api/interactions — wishlist_item_remove click (e2e)', () => {
  it('removes the game and shows the empty-wishlist message when it was the last item', async () => {
    server.use(
      http.post('https://api.isthereanydeal.com/games/prices/v3', () =>
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
        buildItemRemoveInteraction(gameRow!.id)
      )
    )
    const body = await res.json()

    //* Confirms the empty-container regression
    expect(body.data.components[0].components[0].content).toContain('empty')

    const remaining = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userRow!.id))
    expect(remaining).toHaveLength(0)
  })
})
