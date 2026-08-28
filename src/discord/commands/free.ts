import { InteractionResponseType, MessageFlags } from 'discord-api-types/v10'
import { after } from 'next/server'
import type { CommandHandler } from '@/types'
import { getSortedFreeGames } from '@/services/freeGames'
import { buildFreeGamesMessage } from '@/discord/views/freeGames'
import { editOriginalInteractionResponse } from '@/discord/rest'

export const free: CommandHandler = (interaction) => {
  const interactionToken = interaction.token

  //* GamerPower's API has been observed taking 45+ seconds to respond
  //* (confirmed via direct curl) — comfortably past Discord's 3s ACK
  //* window with zero margin in the old synchronous handler. Same
  //* defer + after() + edit pattern as /feedback's screenshot path,
  //* applied here because the slow leg is the ONLY thing this command
  //* does, not an optional attachment upload.
  after(async () => {
    try {
      const giveaways = await getSortedFreeGames()
      await editOriginalInteractionResponse(
        interactionToken,
        buildFreeGamesMessage(giveaways, 0, true)
      )
    } catch (err) {
      console.error('Deferred /free handling failed:', err)
      await editOriginalInteractionResponse(interactionToken, {
        content:
          '⚠️ Something went wrong fetching free games — please try again.',
      }).catch(() => {})
    }
  })

  return {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: { flags: MessageFlags.Ephemeral },
  }
}
