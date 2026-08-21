import { db } from '@/db'
import { games } from '@/db/schema'
import type { ItadGame } from '@/types'

export const upsertGame = async (
  game: ItadGame
): Promise<typeof games.$inferSelect> => {
  const [row] = await db
    .insert(games)
    .values({ itadId: game.id, slug: game.slug, title: game.title })
    .onConflictDoUpdate({
      target: games.itadId,
      set: { slug: game.slug, title: game.title },
    })
    .returning()

  if (!row) throw new Error('upsertGame: insert/update returned no row')
  return row
}
