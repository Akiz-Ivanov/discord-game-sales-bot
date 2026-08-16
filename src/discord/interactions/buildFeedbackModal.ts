import { ComponentType, TextInputStyle } from 'discord-api-types/v10'
import type { APIModalInteractionResponseCallbackData } from 'discord-api-types/v10'

const FEEDBACK_TEXT_MAX_LENGTH = 1000

export const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: 'Report a bug', emoji: { name: '🐛' } },
  { value: 'suggestion', label: 'Suggest something', emoji: { name: '💡' } },
  { value: 'other', label: 'Other feedback', emoji: { name: '💬' } },
] as const

export const buildFeedbackModal =
  (): APIModalInteractionResponseCallbackData => ({
    custom_id: 'feedback_modal',
    title: 'Send feedback',
    components: [
      {
        type: ComponentType.Label,
        label: 'Category',
        component: {
          type: ComponentType.StringSelect,
          custom_id: 'feedback_category',
          required: true,
          options: FEEDBACK_CATEGORIES.map((c) => ({
            label: c.label,
            value: c.value,
            emoji: c.emoji,
          })),
        },
      },
      {
        type: ComponentType.Label,
        label: 'Your feedback',
        description: 'What happened, or what would you like to see?',
        component: {
          type: ComponentType.TextInput,
          custom_id: 'feedback_text',
          style: TextInputStyle.Paragraph,
          max_length: FEEDBACK_TEXT_MAX_LENGTH,
          required: true,
        },
      },
      {
        type: ComponentType.Label,
        label: 'Screenshot (optional)',
        description: 'Attach an image if it helps explain the bug or idea.',
        component: {
          type: ComponentType.FileUpload,
          custom_id: 'feedback_screenshot',
          min_values: 0,
          max_values: 1,
          required: false,
          file_types: ['image'],
        },
      },
    ],
  })
