import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'
import { mention } from '@/discord/interactions/commandMention'

const ACCENT_COLOR = 0x5865f2 // blurple

const HEADER = '### Commands'

const COMMAND_ENTRIES = [
  `> **${mention('price')} \`<game>\`**\n> -# Look up current prices for a game across stores.`,
  `> **${mention('wishlist', 'add')} ${mention('wishlist', 'remove')} ${mention('wishlist', 'list')}**\n> -# Add, remove, or view games on your personal wishlist.`,
  `> **${mention('free')}**\n> -# Show currently free PC games.`,
  `> **${mention('forget-me')}**\n> -# Permanently delete your wishlist and any data stored about you.`,
  `> **${mention('privacy-policy')}**\n> -# See what data this bot stores and how it's used.`,
  `> **${mention('feedback')}**\n> -# Report a bug or suggest something for the bot.`,
  `> **${mention('config', 'alerts-channel')} ${mention('config', 'remove-alerts')}**\n> -# *(Admin only)* Set or remove the channel where sale and free-game alerts get posted.`,
  `> **${mention('about')}**\n> -# What this bot does and where the data comes from.`,
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
