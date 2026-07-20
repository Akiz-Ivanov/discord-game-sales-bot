import type {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponse,
} from 'discord-api-types/v10'

// A command handler receives the full interaction and returns a response,
// sync or async. Union return type means a handler that doesn't need to
// await anything (like ping) can just return the object directly —
// TypeScript treats `T` as assignable wherever `T | Promise<T>` is expected.
export type CommandHandler = (
  interaction: APIChatInputApplicationCommandInteraction
) => APIInteractionResponse | Promise<APIInteractionResponse>
