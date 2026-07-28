import { db } from '@/db'
import { wishlistItems, games } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

//* Inserts a wishlist row for (userId, gameId). Returns null instead of
//* throwing when the pair already exists (unique index on user_id+game_id)
//* — lets the caller distinguish "added" from "already on your wishlist"
//* without a pre-check SELECT.
export const addWishlistItem = async (
  userId: number,
  gameId: number
): Promise<typeof wishlistItems.$inferSelect | null> => {
  const [row] = await db
    .insert(wishlistItems)
    .values({ userId, gameId })
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
  return db
    .select({ game: games })
    .from(wishlistItems)
    .innerJoin(games, eq(wishlistItems.gameId, games.id))
    .where(eq(wishlistItems.userId, userId))
}
