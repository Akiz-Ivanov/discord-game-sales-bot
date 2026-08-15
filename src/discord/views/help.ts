import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'

const ACCENT_COLOR = 0x5865f2 // blurple

const HEADER =
  '### Game Sales Bot\nTrack game prices across stores and get notified when something on your wishlist goes on sale.'

const COMMAND_ENTRIES = [
  '> **/price `<game>`**\n> -# Look up current prices for a game across stores.',
  '> **/wishlist `add` `remove` `list`**\n> -# Add, remove, or view games on your personal wishlist.',
  '> **/free**\n> -# Show currently free PC games.',
  '> **/forget-me**\n> -# Permanently delete your wishlist and any data stored about you.',
  "> **/privacy-policy**\n> -# See what data this bot stores and how it's used.",
  '> **/config `alerts-channel` `remove-alerts`**\n> -# *(Admin only)* Set or remove the channel where sale and free-game alerts get posted.',
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
