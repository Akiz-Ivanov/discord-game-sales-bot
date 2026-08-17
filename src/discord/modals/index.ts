import type { ModalHandler } from '@/types'
import { handleFeedbackModalSubmit } from './feedback'
import { handleWelcomePriceModalSubmit } from './welcomePrice'
import { handleWelcomeAddGameModalSubmit } from './welcomeAddGame'

export const modals: Record<string, ModalHandler> = {
  feedback_modal: handleFeedbackModalSubmit,
  welcome_price_modal: handleWelcomePriceModalSubmit,
  welcome_add_modal: handleWelcomeAddGameModalSubmit,
}
