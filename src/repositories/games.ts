import { db } from '@/db'
import { games } from '@/db/schema'
import type { ItadGame } from '@/types'

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
