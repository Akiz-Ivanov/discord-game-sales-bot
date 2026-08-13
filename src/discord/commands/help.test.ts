import { describe, it, expect } from 'vitest'
import { help } from './help'
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

describe('help command handler', () => {
  it('replies with the Components V2 help message', async () => {
    const data = expectChannelMessage(await help(fakeInteraction))
    expect(data?.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
    expect(data?.components).toHaveLength(1)
  })
})
