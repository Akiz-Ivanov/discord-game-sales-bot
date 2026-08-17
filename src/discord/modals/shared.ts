import { ComponentType } from 'discord-api-types/v10'
import type { APIModalSubmitInteraction } from 'discord-api-types/v10'

type SubmitComponents = APIModalSubmitInteraction['data']['components']

//* Walks a modal submission's top-level Label-wrapped components looking
//* for the one whose inner component matches the given custom_id. Every
//* modal handler needs this same walk since Label wrapping means the
//* actual Select/TextInput/FileUpload never sits at the top level
//* directly — extracted here so feedback.ts and welcomePrice.ts (and any
//* future modal) share one implementation instead of drifting apart.
export const findLabelComponent = (
  components: SubmitComponents,
  customId: string
) => {
  for (const item of components) {
    if (
      item.type === ComponentType.Label &&
      item.component.custom_id === customId
    ) {
      return item.component
    }
  }
  return undefined
}

//* Convenience wrapper for the common case: a modal has one Label-wrapped
//* TextInput and the handler just wants its trimmed value or undefined —
//* covers both "wrong component type" and "not present at all" the same
//* way, so callers get one falsy check instead of two.
export const findLabelTextInputValue = (
  components: SubmitComponents,
  customId: string
): string | undefined => {
  const component = findLabelComponent(components, customId)
  return component && component.type === ComponentType.TextInput
    ? component.value?.trim()
    : undefined
}
