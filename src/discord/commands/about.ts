import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { buildAboutMessage } from '@/discord/views/about'

export const about: CommandHandler = () => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: buildAboutMessage(),
})
