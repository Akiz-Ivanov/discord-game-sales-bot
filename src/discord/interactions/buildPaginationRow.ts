import { ButtonStyle, ComponentType } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'

//* Shared by /wishlist list and /wishlist remove — a plain classic
//* ActionRow (not V2-specific) sitting below whichever content needs
//* paging. Middle button is a disabled "N / M" label, the standard
//* trick for a page indicator inside a button row.
export const buildPaginationRow = (
  prefix: string,
  page: number,
  totalPages: number
): APIActionRowComponent<APIButtonComponentWithCustomId> => ({
  type: ComponentType.ActionRow,
  components: [
    {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      custom_id: `${prefix}:${page - 1}`,
      label: '◀',
      disabled: page === 0,
    },
    {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      custom_id: `${prefix}:noop`,
      label: `${page + 1} / ${totalPages}`,
      disabled: true,
    },
    {
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      custom_id: `${prefix}:${page + 1}`,
      label: '▶',
      disabled: page === totalPages - 1,
    },
  ],
})
