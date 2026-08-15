import { ButtonStyle, ComponentType } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'

export const buildRemoveAlertsConfirmButtons =
  (): APIActionRowComponent<APIButtonComponentWithCustomId> => ({
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Danger,
        custom_id: 'config_remove_alerts_confirm',
        label: 'Yes, remove alerts',
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        custom_id: 'config_remove_alerts_cancel',
        label: 'Cancel',
      },
    ],
  })
