import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  InteractionType,
  ComponentType,
  MessageFlags,
  InteractionResponseType,
} from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'
import { db } from '@/db'
import { games, users, wishlistItems } from '@/db/schema'

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
  it('falls back to the generic error response when after() has no request scope', async () => {
    //* next/server's after() needs Next's own request-scoped
    //* AsyncLocalStorage context, which doesn't exist when a route
    //* handler is called directly rather than through a running server
    //* — same harness limitation already documented on /feedback's
    //* screenshot path and /free. after() throws synchronously here,
    //* which route.ts's component-dispatch try/catch turns into the
    //* generic ephemeral error response. The actual removal, list
    //* edit, and confirmation follow-up all happen inside after(), so
    //* this test can't meaningfully exercise them — that coverage
    //* lives in wishlist.test.ts's unit tests, which mock after() and
    //* invoke its callback directly.
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildItemRemoveInteraction(1)
      )
    )
    const body = await res.json()

    expect(body).toEqual({
      type: InteractionResponseType.UpdateMessage,
      data: {
        flags: MessageFlags.Ephemeral,
        content: '⚠️ Something went wrong — please try that again.',
      },
    })
  })
})
