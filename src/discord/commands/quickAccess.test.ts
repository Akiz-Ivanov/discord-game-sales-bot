import { describe, it, expect } from 'vitest'
import { quickAccess } from './quickAccess'
import { InteractionResponseType } from 'discord-api-types/v10'
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10'

const fakeInteraction = {} as APIChatInputApplicationCommandInteraction

describe('quickAccess command handler', () => {
  it('replies with the lean welcome message', async () => {
    const result = await quickAccess(fakeInteraction)
    expect(result.type).toBe(InteractionResponseType.ChannelMessageWithSource)
  })
})
