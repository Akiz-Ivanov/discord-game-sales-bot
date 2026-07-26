// src/discord/interactions/getInteractionUserId.ts
import type { APIInteraction } from 'discord-api-types/v10'

//* Guild interactions carry the user under `member.user`; DM interactions
//* carry it directly under `user` (no `member` wrapper exists in a DM).
export const getInteractionUserId = (interaction: APIInteraction): string => {
  const id = interaction.member?.user.id ?? interaction.user?.id
  if (!id) throw new Error('Interaction has no resolvable user id')
  return id
}
