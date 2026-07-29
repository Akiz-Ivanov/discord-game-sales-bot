import type { APIInteraction } from 'discord-api-types/v10'

export const getInteractionGuildId = (interaction: APIInteraction): string => {
  const guildId = interaction.guild_id
  if (!guildId) throw new Error('Interaction has no resolvable guild id')
  return guildId
}
