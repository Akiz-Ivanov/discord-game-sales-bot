import { ButtonStyle, ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
  APIActionRowComponent,
  APIButtonComponentWithURL,
} from 'discord-api-types/v10'

const ACCENT_COLOR = 0x5865f2 // blurple, matches help.ts
const PRIVACY_URL = 'https://discord-game-sales-bot.vercel.app/privacy'

const HEADER =
  '### Privacy Summary\nA quick look at what this bot stores. For the full policy, see the button below.'

const SECTION_ENTRIES = [
  '**What we store**\nYour Discord ID, wishlist entries, last-alerted prices, and a daily price-history log kept for a limited time.',
  '**How to remove it**\n`/forget-me` deletes your personal data. Server admins can use `/config remove-alerts` to remove server-level alert config.',
]

const textDisplay = (content: string): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content,
})

export const buildPrivacyPolicyMessage = () => {
  const children: (APITextDisplayComponent | APISeparatorComponent)[] = [
    textDisplay(HEADER),
    { type: ComponentType.Separator },
  ]

  SECTION_ENTRIES.forEach((entry, idx) => {
    children.push(textDisplay(entry))
    if (idx < SECTION_ENTRIES.length - 1) {
      children.push({ type: ComponentType.Separator })
    }
  })

  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: ACCENT_COLOR,
    components: children,
  }

  const linkButtonRow: APIActionRowComponent<APIButtonComponentWithURL> = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Link,
        url: PRIVACY_URL,
        label: 'Read the full privacy policy',
      },
    ],
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [container, linkButtonRow],
  }
}
