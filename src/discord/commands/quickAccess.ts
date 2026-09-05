import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { buildWelcomeMessage } from '@/discord/views/welcome'

export const quickAccess: CommandHandler = () => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: buildWelcomeMessage(true),
})
