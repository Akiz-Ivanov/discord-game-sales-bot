// src/discord/commands/ping.test.ts
import { describe, it, expect } from 'vitest'
import { ping } from './ping'
import { InteractionResponseType } from 'discord-api-types/v10'
import type {
  APIInteractionResponse,
  APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10'

const expectChannelMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected a ChannelMessageWithSource response, got type ${result.type}`
    )
  }
  return result.data
}

//* ping doesn't read anything off the interaction, but CommandHandler's
//* signature requires one — same empty-cast pattern as price.test.ts's
//* buildInteraction, just simpler since ping ignores it entirely.
const fakeInteraction = {} as APIChatInputApplicationCommandInteraction

describe('ping command handler', () => {
  it('replies with Pong!', async () => {
    const data = expectChannelMessage(await ping(fakeInteraction))
    expect(data).toEqual({ content: 'Pong!' })
  })
})
