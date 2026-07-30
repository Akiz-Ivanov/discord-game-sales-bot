import { db } from '@/db'
import { guilds } from '@/db/schema'

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
