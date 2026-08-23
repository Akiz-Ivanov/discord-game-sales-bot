import { ButtonStyle, ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
  APIActionRowComponent,
  APIButtonComponentWithURL,
} from 'discord-api-types/v10'
import { mention } from '@/discord/interactions/commandMention'
import { BOT_NAME } from '@/lib/constants'

const ACCENT_COLOR = 0x1abc9c // teal
const GITHUB_URL = 'https://github.com/Akiz-Ivanov/discord-game-sales-bot'

const HEADER = `### About ${BOT_NAME}\nLook up game prices, get pinged when something on your wishlist drops (or goes free), and catch daily free-game giveaways whether you're tracking anything or not.`

const SECTION_ENTRIES = [
  `Built by one person in their spare time. Bug reports and ideas are always welcome, ${mention('feedback')} reaches me directly.`,
  '**Data comes from these APIs**\n[IsThereAnyDeal](https://isthereanydeal.com) tracks game prices and historical lows across dozens of stores.\n[GamerPower](https://www.gamerpower.com) tracks free games, beta keys, and giveaways across PC and more.',
  `-# ${mention('help')} for commands · ${mention('privacy-policy')} for what I store`,
]

const textDisplay = (content: string): APITextDisplayComponent => ({
  type: ComponentType.TextDisplay,
  content,
})

export const buildAboutMessage = () => {
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
        url: GITHUB_URL,
        label: 'View on GitHub',
      },
    ],
  }

  return {
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [container, linkButtonRow],
  }
}
