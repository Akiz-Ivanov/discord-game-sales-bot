// src/discord/autocomplete/index.ts
import type { AutocompleteHandler } from '@/types'
import { handleGameSearchAutocomplete } from './gameSearch'

//* Keyed by command name — both /price and /wishlist route here since
//* each currently has exactly one autocompletable option ("game"). If a
//* second autocompletable option lands on the same command later, this'll
//* need to branch on option name too (getFocusedOption already walks the
//* whole tree, so that's a small change here, not a redesign).
export const autocomplete: Record<string, AutocompleteHandler> = {
  price: handleGameSearchAutocomplete,
  wishlist: handleGameSearchAutocomplete,
}
