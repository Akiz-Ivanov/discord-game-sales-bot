// src/discord/autocomplete/gameSearch.ts
import { InteractionResponseType } from 'discord-api-types/v10'
import type { AutocompleteHandler } from '@/types'
import { searchGamesByTitle } from '@/itad/client'
import { getFocusedQuery } from '@/discord/interactions/getFocusedOption'
import { AUTOCOMPLETE_MIN_QUERY_LENGTH } from '@/lib/constants'

const MAX_CHOICES = 25 // Discord's own autocomplete choice cap
const MAX_CHOICE_NAME_LENGTH = 100 // Discord's own choice-name cap

//* Shared by /price and /wishlist add's "game" option. Deliberately hits
//* ITAD directly, never the DB: the games table only has rows for titles
//* someone's already resolved, so it can't serve fresh typing — and
//* querying Neon on every keystroke would be the worst possible pattern
//* for CU-hour billing (frequent sparse queries repeatedly wake a
//* suspended compute and reset its 5-minute idle timer, keeping it "on"
//* far more than the actual work needs).
export const handleGameSearchAutocomplete: AutocompleteHandler = async (
  interaction
) => {
  const query = getFocusedQuery(interaction)

  //* Below the threshold: no suggestions, no ITAD call. Discord fires an
  //* autocomplete interaction on effectively every keystroke pause with
  //* no guaranteed built-in debounce — this is the cheap filter that
  //* keeps ITAD's shared rate limit (also used by /price, /wishlist add,
  //* and the daily cron) from absorbing 1-2 character noise.
  if (query.length < AUTOCOMPLETE_MIN_QUERY_LENGTH) {
    return {
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: { choices: [] },
    }
  }

  try {
    const matches = await searchGamesByTitle(query)
    return {
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: {
        choices: matches.slice(0, MAX_CHOICES).map((game) => ({
          name: game.title.slice(0, MAX_CHOICE_NAME_LENGTH),
          value: game.id,
        })),
      },
    }
  } catch (err) {
    //* Autocomplete can't show an error state or message the user — an
    //* empty list is the only graceful failure. Logged server-side so a
    //* real ITAD outage is still visible in Vercel function logs.
    console.error('Autocomplete search failed:', err)
    return {
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: { choices: [] },
    }
  }
}
