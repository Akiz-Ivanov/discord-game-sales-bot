import { db } from '@/db'
import { guilds } from '@/db/schema'
import { eq, isNotNull } from 'drizzle-orm'

export const upsertGuildChannel = async (
  guildId: string,
  channelId: string
) => {
  const [row] = await db
    .insert(guilds)
    .values({ guildId, notificationChannelId: channelId })
    .onConflictDoUpdate({
      target: guilds.guildId,
      set: { notificationChannelId: channelId },
    })
    .returning()

  return row
}

export const getGuildsWithNotificationChannel = async (): Promise<
  { guildId: string; notificationChannelId: string }[]
> => {
  const rows = await db
    .select({
      guildId: guilds.guildId,
      notificationChannelId: guilds.notificationChannelId,
    })
    .from(guilds)
    .where(isNotNull(guilds.notificationChannelId))

  //* isNotNull() guarantees this at the SQL level, but Drizzle's inferred
  //* return type still reflects the column's nullable declaration — same
  //* explicit-annotation pattern already used elsewhere for narrowing a
  //* nullable column post-filter.
  return rows as { guildId: string; notificationChannelId: string }[]
}

export const getGuildByGuildId = async (
  guildId: string
): Promise<typeof guilds.$inferSelect | null> => {
  const [row] = await db
    .select()
    .from(guilds)
    .where(eq(guilds.guildId, guildId))
  return row ?? null
}

export const deleteGuildByGuildId = async (
  guildId: string
): Promise<boolean> => {
  const deleted = await db
    .delete(guilds)
    .where(eq(guilds.guildId, guildId))
    .returning({ id: guilds.id })

  return deleted.length > 0
}
