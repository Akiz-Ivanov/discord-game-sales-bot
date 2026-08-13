import { ButtonStyle, ComponentType } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'

export const buildBundlesButton = (
  itadId: string
): APIActionRowComponent<APIButtonComponentWithCustomId> => ({
  type: ComponentType.ActionRow,
  components: [
    {
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      custom_id: `price_bundles:${itadId}`,
      label: '📦 Show bundles',
    },
  ],
})
