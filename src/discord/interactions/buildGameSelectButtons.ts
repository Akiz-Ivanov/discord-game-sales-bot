import { ButtonStyle, ComponentType } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'
import type { ItadGame } from '@/types'

const MAX_BUTTONS = 5 // Discord's own per-row cap — matches the existing
// 5-candidate slice already used everywhere disambiguation happens.

//* Shared by /price and /wishlist add's multi-match branches. custom_id
//* carries the ITAD ID after the prefix (e.g. "price_select:{uuid}") so
//* the component handler on the other end knows both which flow to run
//* and which game was picked — no server-side state needed.
export const buildGameSelectButtons = (
  matches: ItadGame[],
  customIdPrefix: string
): APIActionRowComponent<APIButtonComponentWithCustomId> => ({
  type: ComponentType.ActionRow,
  components: matches.slice(0, MAX_BUTTONS).map((g) => ({
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    label: g.title.slice(0, 80), // Discord's own button-label cap
    custom_id: `${customIdPrefix}:${g.id}`,
  })),
})
