import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'

// Ensures a `users` row exists for this Discord user and returns it —
// wishlist_items references users.id (our serial PK), not the Discord
export const upsertUser = async (
  discordId: string,
  guildId: string
): Promise<typeof users.$inferSelect> => {
  const [row] = await db
    .insert(users)
    .values({ discordId, guildId })
    .onConflictDoUpdate({
      target: users.discordId,
      set: { guildId },
    })
    .returning()

  if (!row) throw new Error('upsertUser: insert/update returned no row')
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

export const deleteUserByDiscordId = async (
  discordId: string
): Promise<boolean> => {
  const deleted = await db
    .delete(users)
    .where(eq(users.discordId, discordId))
    .returning({ id: users.id })

  //* wishlist_items.userId has onDelete: 'cascade', so this single delete
  //* is all that's needed — no separate wishlist cleanup step.
  return deleted.length > 0
}
