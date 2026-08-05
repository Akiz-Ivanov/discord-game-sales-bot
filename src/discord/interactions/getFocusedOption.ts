import type { APIApplicationCommandAutocompleteInteraction } from 'discord-api-types/v10'

//* Loosely typed on purpose — discord-api-types' real option union is deep
//* (subcommand/subcommand-group/basic-option variants), and all this needs
//* is "does it have `focused`, does it have nested `options`". Mirrors the
//* duck-typing already used elsewhere in this codebase (e.g. config.ts's
//* `'value' in channelOption`) rather than fighting the full union type.
type FocusableOption = {
  focused?: boolean
  value?: string | number
  options?: FocusableOption[]
}

//* Discord marks exactly one option `focused: true` per autocomplete
//* interaction — recurses because for /wishlist add it sits one level
//* down, under the "add" subcommand.
const findFocused = (options: FocusableOption[] | undefined): string | null => {
  for (const option of options ?? []) {
    if (option.focused && option.value !== undefined) {
      return String(option.value)
    }
    if (option.options) {
      const nested = findFocused(option.options)
      if (nested !== null) return nested
    }
  }
  return null
}

export const getFocusedQuery = (
  interaction: APIApplicationCommandAutocompleteInteraction
): string =>
  findFocused(
    interaction.data.options as FocusableOption[] | undefined
  )?.trim() ?? ''
