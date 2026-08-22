import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { http, HttpResponse } from 'msw'
import { GET } from './route'
import { server } from '@/test/e2e/setup'
import { db } from '@/db'
import { guilds, users, games, wishlistItems } from '@/db/schema'
import noSaleFixture from '@/test/e2e/fixtures/itad/prices-hollow-knight-no-sale.json'
import pricesFixture from '@/test/e2e/fixtures/itad/prices-hollow-knight.json'

const HOLLOW_KNIGHT_ITAD_ID = '018d937f-1ae9-734c-ba47-bd357cf07edd'
const GUILD_ID = 'guild-1'
const CHANNEL_ID = 'channel-1'
const DISCORD_USER_ID = 'user-1'

const buildRequest = () =>
  new Request('http://localhost/api/cron/price-check', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })

const PREVIOUS_NOTIFIED_PRICE = 1499

const seedWishlistedGame = async () => {
  const [guild] = await db
    .insert(guilds)
    .values({ guildId: GUILD_ID, notificationChannelId: CHANNEL_ID })
    .returning()

  const [user] = await db
    .insert(users)
    .values({ discordId: DISCORD_USER_ID, guildId: GUILD_ID })
    .returning()

  const [game] = await db
    .insert(games)
    .values({
      itadId: HOLLOW_KNIGHT_ITAD_ID,
      slug: 'hollow-knight',
      title: 'Hollow Knight',
    })
    .returning()

  const [wishlistItem] = await db
    .insert(wishlistItems)
    .values({
      userId: user!.id,
      gameId: game!.id,
      lastNotifiedPrice: PREVIOUS_NOTIFIED_PRICE,
    })
    .returning()

  return { guild, user, game, wishlistItem }
}

describe('GET /api/cron/price-check (e2e)', () => {
  it('rejects a request without the correct bearer token', async () => {
    const res = await GET(new Request('http://localhost/api/cron/price-check'))
    expect(res.status).toBe(401)
  })

  it('finds a genuine price improvement, posts an alert, and updates lastNotifiedPrice', async () => {
    const { wishlistItem } = await seedWishlistedGame()

    const res = await GET(buildRequest())
    const body = await res.json()

    expect(body).toEqual({ guildsNotified: 1, guildsFailed: 0 })

    const [updated] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, wishlistItem!.id))

    expect(updated!.lastNotifiedPrice).toBe(749)
  })

  it('reports zero guilds notified when there is nothing wishlisted', async () => {
    const res = await GET(buildRequest())
    const body = await res.json()

    expect(body).toEqual({ guildsNotified: 0, guildsFailed: 0 })
  })

  it('groups two wishlisters of the same game in one guild into a single alert post', async () => {
    const { game, wishlistItem: firstItem } = await seedWishlistedGame()

    const [secondUser] = await db
      .insert(users)
      .values({ discordId: 'user-2', guildId: GUILD_ID })
      .returning()

    const [secondItem] = await db
      .insert(wishlistItems)
      .values({
        userId: secondUser!.id,
        gameId: game!.id,
        lastNotifiedPrice: PREVIOUS_NOTIFIED_PRICE,
      })
      .returning()

    //* guildsNotified: 1 alone wouldn't prove grouping — one guild posted
    //* to once looks identical to one guild posted to twice from the
    //* response body. Counting actual Discord POSTs is what actually
    //* proves both recipients landed in a single card.
    let postCount = 0
    server.use(
      http.post(
        'https://discord.com/api/v10/channels/:channelId/messages',
        () => {
          postCount++
          return HttpResponse.json({ id: 'fake-message-id' })
        }
      )
    )

    const res = await GET(buildRequest())
    const body = await res.json()

    expect(body).toEqual({ guildsNotified: 1, guildsFailed: 0 })
    expect(postCount).toBe(1)

    const [updatedFirst] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, firstItem!.id))
    const [updatedSecond] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, secondItem!.id))

    expect(updatedFirst!.lastNotifiedPrice).toBe(749)
    expect(updatedSecond!.lastNotifiedPrice).toBe(749)
  })

  it('clears lastNotifiedPrice when a wishlisted game falls off sale', async () => {
    const { wishlistItem } = await seedWishlistedGame()

    server.use(
      http.post('https://api.isthereanydeal.com/games/prices/v3', () =>
        HttpResponse.json(noSaleFixture)
      )
    )

    const res = await GET(buildRequest())
    const body = await res.json()

    //* No genuine sale — nothing to alert on, but the stale
    //* lastNotifiedPrice floor still needs clearing so a future sale
    //* at the same price counts as fresh.
    expect(body).toEqual({ guildsNotified: 0, guildsFailed: 0 })

    const [updated] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, wishlistItem!.id))

    expect(updated!.lastNotifiedPrice).toBeNull()
  })

  it('re-alerts after a reset even at the same price as the original alert', async () => {
    const { wishlistItem } = await seedWishlistedGame()

    //* Step 1 — genuine sale (fixture default), first-ever alert at 749.
    const firstRun = await GET(buildRequest())
    expect(await firstRun.json()).toEqual({
      guildsNotified: 1,
      guildsFailed: 0,
    })

    const [afterFirst] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, wishlistItem!.id))
    expect(afterFirst!.lastNotifiedPrice).toBe(749)

    //* Step 2 — game falls off sale, lastNotifiedPrice resets to null.
    server.use(
      http.post('https://api.isthereanydeal.com/games/prices/v3', () =>
        HttpResponse.json(noSaleFixture)
      )
    )

    const secondRun = await GET(buildRequest())
    expect(await secondRun.json()).toEqual({
      guildsNotified: 0,
      guildsFailed: 0,
    })

    const [afterSecond] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, wishlistItem!.id))
    expect(afterSecond!.lastNotifiedPrice).toBeNull()

    //* Step 3 — sale returns at the SAME 749 price as the original alert.
    //* Without the reset in step 2, shouldNotify's strict "<" check would
    //* silently filter this forever (749 is never < 749). This is the
    //* exact regression the reset logic exists to prevent.
    server.use(
      http.post('https://api.isthereanydeal.com/games/prices/v3', () =>
        HttpResponse.json(pricesFixture)
      )
    )

    const thirdRun = await GET(buildRequest())
    expect(await thirdRun.json()).toEqual({
      guildsNotified: 1,
      guildsFailed: 0,
    })

    const [afterThird] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, wishlistItem!.id))
    expect(afterThird!.lastNotifiedPrice).toBe(749)
  })
})
