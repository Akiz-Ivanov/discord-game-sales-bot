import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { buildPrivacyPolicyMessage } from '@/discord/views/privacyPolicy'

export const privacyPolicy: CommandHandler = () => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: buildPrivacyPolicyMessage(),
})
