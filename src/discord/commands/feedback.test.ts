import { describe, it, expect } from 'vitest'
import { feedback } from './feedback'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10'

const fakeInteraction = {} as APIChatInputApplicationCommandInteraction

describe('feedback command handler', () => {
  it('opens the feedback modal directly, with no intermediate response', async () => {
    const result = await feedback(fakeInteraction)
    expect(result.type).toBe(InteractionResponseType.Modal)
    if (result.type !== InteractionResponseType.Modal) return
    expect(result.data?.custom_id).toBe('feedback_modal')
  })
})
