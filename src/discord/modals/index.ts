import type { ModalHandler } from '@/types'
import { handleFeedbackModalSubmit } from './feedback'

export const modals: Record<string, ModalHandler> = {
  feedback_modal: handleFeedbackModalSubmit,
}
