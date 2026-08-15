import { ButtonStyle, ComponentType } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
} from 'discord-api-types/v10'

export const buildForgetMeConfirmButtons =
  (): APIActionRowComponent<APIButtonComponentWithCustomId> => ({
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Danger,
        custom_id: 'forget_me_confirm',
        label: 'Yes, delete everything',
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        custom_id: 'forget_me_cancel',
        label: 'Cancel',
      },
    ],
  })
