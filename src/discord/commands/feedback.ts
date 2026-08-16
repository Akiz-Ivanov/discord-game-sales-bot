import { InteractionResponseType } from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { buildFeedbackModal } from '@/discord/interactions/buildFeedbackModal'

export const feedback: CommandHandler = () => ({
  type: InteractionResponseType.Modal,
  data: buildFeedbackModal(),
})
