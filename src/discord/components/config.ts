import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { deleteGuildByGuildId } from '@/repositories/guilds'

//* Re-derives guildId from the interaction itself rather than trusting
//* custom_id — same posture as handleForgetMeConfirm. custom_id stays
//* static since this message is ephemeral: only the admin who ran the
//* command can ever see or click it.
export const handleRemoveAlertsConfirm: ComponentHandler = async (
  interaction
) => {
  const guildId = getInteractionGuildId(interaction)
  const deleted = await deleteGuildByGuildId(guildId)

  return {
    type: InteractionResponseType.UpdateMessage,
    data: {
      flags: MessageFlags.Ephemeral,
      content: deleted
        ? "✅ Done — this server's alert configuration has been removed."
        : "This server doesn't have any alert configuration to remove.",
      components: [],
    },
  }
}

export const handleRemoveAlertsCancel: ComponentHandler = () => ({
  type: InteractionResponseType.UpdateMessage,
  data: {
    flags: MessageFlags.Ephemeral,
    content: 'Cancelled — nothing was changed.',
    components: [],
  },
})
