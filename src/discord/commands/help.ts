import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { buildHelpMessage } from '@/discord/views/help'

export const help: CommandHandler = () => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: buildHelpMessage(),
})
