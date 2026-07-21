import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'

export const ping: CommandHandler = () => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { content: 'Pong!' },
})
