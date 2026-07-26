import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { ComponentHandler } from '@/types'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getUserByDiscordId } from '@/repositories/users'
import { getWishlist, removeGameFromWishlist } from '@/services/wishlist'

export const handleWishlistRemoveSelect: ComponentHandler = async (
  interaction
) => {
  //* StringSelect interactions carry the chosen option(s) here — one
  //* value since this menu doesn't allow multi-select.
  const selectedGameId = Number(
    interaction.data && 'values' in interaction.data
      ? interaction.data.values[0]
      : undefined
  )

  const discordId = getInteractionUserId(interaction)
  const user = await getUserByDiscordId(discordId)

  //* Shouldn't happen in practice — you can't have opened this menu
  //* without a user row existing — but keeps the handler total rather
  //* than assuming.
  if (!user || !selectedGameId) {
    return {
      type: InteractionResponseType.UpdateMessage,
      data: {
        flags: MessageFlags.Ephemeral,
        content: 'Something went wrong — try `/wishlist remove` again.',
        components: [],
      },
    }
  }

  //* Grab the title before removing — the select option only round-trips
  //* `value` (the id), not the `label` shown in the menu.
  const items = await getWishlist(discordId)
  const matched = items.find((i) => i.game.id === selectedGameId)

  const result = await removeGameFromWishlist(user.id, selectedGameId)

  const content =
    result.status === 'removed'
      ? `✅ Removed **${matched?.game.title ?? 'that game'}** from your wishlist.`
      : `That game's already off your wishlist — nothing to remove.`

  return {
    type: InteractionResponseType.UpdateMessage,
    data: { flags: MessageFlags.Ephemeral, content, components: [] },
  }
}
