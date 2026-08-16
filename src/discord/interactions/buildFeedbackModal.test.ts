import { describe, it, expect } from 'vitest'
import { buildFeedbackModal, FEEDBACK_CATEGORIES } from './buildFeedbackModal'
import { ComponentType, TextInputStyle } from 'discord-api-types/v10'
import type { APILabelComponent } from 'discord-api-types/v10'

//* buildFeedbackModal only ever produces Label-wrapped components (not
//* the legacy ActionRow variant) — this narrows the test-side type the
//* same way findLabelComponent narrows it at runtime.
const getLabelComponents = (result: ReturnType<typeof buildFeedbackModal>) =>
  result.components as APILabelComponent[]

describe('buildFeedbackModal', () => {
  it('sets the modal custom_id and title', () => {
    const result = buildFeedbackModal()
    expect(result.custom_id).toBe('feedback_modal')
    expect(result.title).toBe('Send feedback')
  })

  it('builds three Label-wrapped components', () => {
    const labels = getLabelComponents(buildFeedbackModal())
    expect(labels).toHaveLength(3)
    expect(labels.every((l) => l.type === ComponentType.Label)).toBe(true)
  })

  it('builds a required category StringSelect with all three options', () => {
    const [category] = getLabelComponents(buildFeedbackModal())
    expect(category.component).toMatchObject({
      type: ComponentType.StringSelect,
      custom_id: 'feedback_category',
      required: true,
    })
    const options =
      'options' in category.component ? category.component.options : []
    expect(options).toHaveLength(FEEDBACK_CATEGORIES.length)
    expect(options[0]).toMatchObject({
      label: 'Report a bug',
      value: 'bug',
      emoji: { name: '🐛' },
    })
  })

  it('builds a required Paragraph TextInput capped under the embed-safe length', () => {
    const [, textInput] = getLabelComponents(buildFeedbackModal())
    expect(textInput.component).toMatchObject({
      type: ComponentType.TextInput,
      custom_id: 'feedback_text',
      style: TextInputStyle.Paragraph,
      required: true,
      max_length: 1000,
    })
  })

  it('builds an optional single-file FileUpload', () => {
    const [, , screenshot] = getLabelComponents(buildFeedbackModal())
    expect(screenshot.component).toMatchObject({
      type: ComponentType.FileUpload,
      custom_id: 'feedback_screenshot',
      required: false,
      min_values: 0,
      max_values: 1,
    })
  })
})
