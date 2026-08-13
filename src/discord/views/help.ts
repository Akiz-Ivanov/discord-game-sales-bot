import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'

const ACCENT_COLOR = 0x5865f2 // same blurple as /price's no-sale color — keeps a consistent bot identity

const HEADER =
  '### Game Sales Bot\nTrack game prices across stores and get notified when something on your wishlist goes on sale.'

const FOOTER =
  '-# Powered by [IsThereAnyDeal](https://isthereanydeal.com) & [GamerPower](https://www.gamerpower.com)'

const COMMAND_ENTRIES = [
  '> **/price `<game>`**\n> -# Look up current prices for a game across stores.',
  '> **/wishlist `add` `remove` `list`**\n> -# Add, remove, or view games on your personal wishlist.',
  '> **/free**\n> -# Show currently free PC games.',
  '> **/config `alerts-channel`**\n> -# *(Admin only)* Set the channel where sale and free-game alerts get posted.',
]
const textDisplay = (content: string): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content,
})

export const buildHelpMessage = () => {
  const children: (APITextDisplayComponent | APISeparatorComponent)[] = [
    textDisplay(HEADER),
    { type: ComponentType.Separator },
  ]

  COMMAND_ENTRIES.forEach((entry, idx) => {
    children.push(textDisplay(entry))
    if (idx < COMMAND_ENTRIES.length - 1) {
      children.push({ type: ComponentType.Separator })
    }
  })

  children.push({ type: ComponentType.Separator })
  children.push(textDisplay(FOOTER))

  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: ACCENT_COLOR,
    components: children,
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [container],
  }
}
