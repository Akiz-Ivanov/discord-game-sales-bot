import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getUserByDiscordId } from '@/repositories/users'
import { buildForgetMeConfirmButtons } from '@/discord/interactions/buildForgetMeConfirmButtons'

export const forgetMe: CommandHandler = async (interaction) => {
  const discordId = getInteractionUserId(interaction)
  const user = await getUserByDiscordId(discordId)

  if (!user) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: "You don't have any stored data to delete.",
      },
    }
  }

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content:
        "⚠️ This will permanently delete your wishlist and remove your data from this bot. This can't be undone. Are you sure?",
      components: [buildForgetMeConfirmButtons()],
    },
  }
}
