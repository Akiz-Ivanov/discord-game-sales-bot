import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { deleteUserByDiscordId } from '@/repositories/users'

//* Re-derives the discordId from the interaction rather than trusting
//* anything in custom_id — same "don't trust the click" posture as
//* handlePriceWishlistToggle. custom_id stays static (no suffix needed)
export const handleForgetMeConfirm: ComponentHandler = async (interaction) => {
  const discordId = getInteractionUserId(interaction)
  const deleted = await deleteUserByDiscordId(discordId)

  return {
    type: InteractionResponseType.UpdateMessage,
    data: {
      flags: MessageFlags.Ephemeral,
      content: deleted
        ? '✅ Done — your wishlist and any stored data about you have been deleted.'
        : "You don't have any stored data to delete.",
      components: [],
    },
  }
}

export const handleForgetMeCancel: ComponentHandler = () => ({
  type: InteractionResponseType.UpdateMessage,
  data: {
    flags: MessageFlags.Ephemeral,
    content: 'Cancelled — nothing was deleted.',
    components: [],
  },
})
