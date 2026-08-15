import { describe, it, expect } from 'vitest'
import { privacyPolicy } from './privacyPolicy'
import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from 'discord-api-types/v10'

const expectChannelMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected a ChannelMessageWithSource response, got type ${result.type}`
    )
  }
  return result.data
}

const fakeInteraction = {} as APIChatInputApplicationCommandInteraction

describe('privacyPolicy command handler', () => {
  it('replies with the Components V2 privacy summary message', async () => {
    const data = expectChannelMessage(await privacyPolicy(fakeInteraction))
    expect(data?.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
    expect(data?.components).toHaveLength(2) // container + link button row
  })
})
