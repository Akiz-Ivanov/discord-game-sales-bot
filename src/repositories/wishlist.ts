import { db } from '@/db'
import { wishlistItems, games, guilds, users } from '@/db/schema'
import { and, count, eq, isNotNull } from 'drizzle-orm'

//* Inserts a wishlist row for (userId, gameId). Returns null instead of
//* throwing when the pair already exists (unique index on user_id+game_id)
//* — lets the caller distinguish "added" from "already on your wishlist"
//* without a pre-check SELECT.
export const addWishlistItem = async (
  userId: number,
  gameId: number,
  initialPrice?: number
): Promise<typeof wishlistItems.$inferSelect | null> => {
  const [row] = await db
    .insert(wishlistItems)
    .values({ userId, gameId, lastNotifiedPrice: initialPrice ?? null })
    .onConflictDoNothing()
    .returning()

  return row ?? null
}

//* Deletes the wishlist row for (userId, gameId). Returns true if a row was
//* actually deleted, false if it wasn't on the wishlist to begin with.
export const removeWishlistItem = async (userId: number, gameId: number) => {
  const deleted = await db
    .delete(wishlistItems)
    .where(
      and(eq(wishlistItems.userId, userId), eq(wishlistItems.gameId, gameId))
    )
    .returning()

  return deleted.length > 0
}

//* All games on a user's wishlist, joined for display — title/id come
//* straight from the games table, no ITAD call needed.
export const listWishlistItems = async (userId: number) => {
  return db.query.wishlistItems.findMany({
    where: eq(wishlistItems.userId, userId),
    with: { game: true },
  })
}

//* Flat, ungrouped rows — one per (user, wishlist item) pair, scoped to
//* guilds that have a configured alert channel. Deliberately NOT grouped
//* by game here: last_notified_price lives per wishlist_item, so the
//* notify decision has to happen per-user before any grouping-by-game
//* happens (that grouping is the service layer's job, after filtering).
export const getWishlistedGamesByGuild = async () => {
  return db
    .select({
      guildId: guilds.guildId,
      notificationChannelId: guilds.notificationChannelId,
      wishlistItemId: wishlistItems.id,
      discordId: users.discordId,
      gameId: games.id,
      itadId: games.itadId,
      title: games.title,
      lastNotifiedPrice: wishlistItems.lastNotifiedPrice,
    })
    .from(guilds)
    .innerJoin(users, eq(users.guildId, guilds.guildId))
    .innerJoin(wishlistItems, eq(wishlistItems.userId, users.id))
    .innerJoin(games, eq(games.id, wishlistItems.gameId))
    .where(isNotNull(guilds.notificationChannelId))
}

export const countWishlistItems = async (userId: number): Promise<number> => {
  const [row] = await db
    .select({ count: count() })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
  return row?.count ?? 0
}

//* Bulk-writes lastNotifiedPrice after a cron run — either to the price
//* just alerted, or back to null when a game's dropped off sale (so a
//* future sale at ANY price, even one identical to the last alert,
//* counts as fresh). One UPDATE per row: Postgres has no single-statement
//* "different SET value per row" without a CASE expression, and this only
//* ever runs against however many rows a single cron pass actually touched.
export const updateLastNotifiedPrices = async (
  entries: { wishlistItemId: number; price: number | null }[]
) => {
  await Promise.all(
    entries.map((e) =>
      db
        .update(wishlistItems)
        .set({ lastNotifiedPrice: e.price })
        .where(eq(wishlistItems.id, e.wishlistItemId))
    )
  )
}
