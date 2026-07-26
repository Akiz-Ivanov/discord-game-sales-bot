import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'

// Ensures a `users` row exists for this Discord user and returns it —
// wishlist_items references users.id (our serial PK), not the Discord
// snowflake directly. Same upsert-by-unique-index shape as upsertGame.
export const upsertUser = async (discordId: string) => {
  const [row] = await db
    .insert(users)
    .values({ discordId })
    .onConflictDoUpdate({
      target: users.discordId,
      // Nothing to actually update — discordId is both the value and
      // the conflict target — but onConflictDoUpdate needs a `set` to
      // return the existing row via `.returning()`. A no-op set on the
      // same column does that without a fake mutation.
      set: { discordId },
    })
    .returning()

  return row
}

export const getUserByDiscordId = async (
  discordId: string
): Promise<typeof users.$inferSelect | null> => {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.discordId, discordId))
  return row ?? null
}
