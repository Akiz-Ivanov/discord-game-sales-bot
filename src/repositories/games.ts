import { db } from '@/db'
import { games } from '@/db/schema'
import type { ItadGame } from '@/types'

// Ensures a `games` row exists for this ITAD game and returns it — including
// the internal serial `id` that `prices`/`wishlist_items` actually reference.
// ITAD's UUID is the conflict target since it's the one thing guaranteed
// stable and unique per game.
export const upsertGame = async (game: ItadGame) => {
  const [row] = await db
    .insert(games)
    .values({
      itadId: game.id,
      slug: game.slug,
      title: game.title,
    })
    .onConflictDoUpdate({
      target: games.itadId,
      set: { slug: game.slug, title: game.title },
    })
    .returning()

  return row
}
