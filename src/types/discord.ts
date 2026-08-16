import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageComponentInteraction,
  APIApplicationCommandAutocompleteInteraction,
  APIInteractionResponse,
  APIModalSubmitInteraction,
} from 'discord-api-types/v10'

export type CommandHandler = (
  interaction: APIChatInputApplicationCommandInteraction
) => APIInteractionResponse | Promise<APIInteractionResponse>

export type ComponentHandler = (
  interaction: APIMessageComponentInteraction
) => APIInteractionResponse | Promise<APIInteractionResponse>

export type AutocompleteHandler = (
  interaction: APIApplicationCommandAutocompleteInteraction
) => APIInteractionResponse | Promise<APIInteractionResponse>

export type ModalHandler = (
  interaction: APIModalSubmitInteraction
) => Promise<APIInteractionResponse> | APIInteractionResponse
