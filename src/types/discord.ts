import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
  APIInteractionResponse,
} from 'discord-api-types/v10'

export type CommandHandler = (
  interaction: APIChatInputApplicationCommandInteraction
) => APIInteractionResponse | Promise<APIInteractionResponse>

export type ComponentHandler = (
  interaction: APIMessageComponentInteraction
) => APIInteractionResponse | Promise<APIInteractionResponse>
