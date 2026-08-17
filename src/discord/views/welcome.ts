import { ButtonStyle, ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
  APIContainerComponent,
  APISectionComponent,
  APISeparatorComponent,
  APITextDisplayComponent,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10'
import { customEmojiTag } from '../embeds/discordEmoji'

const ACCENT_COLOR = 0x00d4ff // electric cyan — distinct from every other accent color already in use (green/purple/orange/gold/blurple)

const RICH_HEADER =
  '### Game Sales Bot\n' +
  'Hey, thanks for having me here. I keep an eye on prices and let you know when something on your list goes on sale (or goes free).\n\n' +
  "Here's a little interface to help you get started:"

const LEAN_HEADER = "### Game Sales Bot\nHere's what I can do for you:"

const FOOTER = '-# New here? `/help` has the full command list.'

type CustomIdButtonStyle =
  | ButtonStyle.Primary
  | ButtonStyle.Secondary
  | ButtonStyle.Success
  | ButtonStyle.Danger

const ENTRIES: {
  text: string
  buttonLabel: string
  customId: string
  style: CustomIdButtonStyle
}[] = [
  {
    text: `${customEmojiTag('tag', '1538691938566414456')} **Check a price**\nCompare prices for a game across dozens of stores`,
    buttonLabel: 'Check price',
    customId: 'welcome_check_price',
    style: ButtonStyle.Primary,
  },
  {
    text: `${customEmojiTag('heart', '1538897010176954439')} **Build your wishlist**\nI'll watch it and ping you the moment it drops`,
    buttonLabel: 'My wishlist',
    customId: 'welcome_my_wishlist',
    style: ButtonStyle.Success,
  },
  {
    text: `${customEmojiTag('gift', '1538895109733486662')} **Free games right now**\nGrab today's freebies before they expire`,
    buttonLabel: 'Free games',
    customId: 'welcome_free_games',
    style: ButtonStyle.Primary,
  },
]

const buildEntrySection = (
  entry: (typeof ENTRIES)[number]
): APISectionComponent => ({
  type: ComponentType.Section,
  components: [{ type: ComponentType.TextDisplay, content: entry.text }],
  accessory: {
    type: ComponentType.Button,
    style: entry.style,
    custom_id: entry.customId,
    label: entry.buttonLabel,
  },
})

//* Plain classic ActionRow, sibling to the Container — same pattern as
//* wishlistList's pagination row. Secondary/gray on both: these are
//* lower-commitment utility actions, not the card's headline CTAs, so
//* they deliberately read as quieter than the three Sections above.
const buildUtilityRow =
  (): APIActionRowComponent<APIButtonComponentWithCustomId> => ({
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        custom_id: 'welcome_help',
        label: 'Help',
        emoji: { id: '1538723192707743827', name: 'help' },
      },
      {
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        custom_id: 'welcome_feedback',
        label: 'Feedback',
        emoji: { id: '1538726236178874429', name: 'feedback' },
      },
    ],
  })

export const buildWelcomeMessage = (
  ephemeral = false
): RESTPostAPIChannelMessageJSONBody => {
  const header = ephemeral ? LEAN_HEADER : RICH_HEADER

  const children: (
    APISectionComponent | APISeparatorComponent | APITextDisplayComponent
  )[] = [
    { type: ComponentType.TextDisplay, content: header },
    { type: ComponentType.Separator },
  ]

  ENTRIES.forEach((entry, idx) => {
    children.push(buildEntrySection(entry))
    if (idx < ENTRIES.length - 1) {
      children.push({ type: ComponentType.Separator })
    }
  })

  //* Footer and utility row only on the rich (pinned) card — the
  //* lean/ephemeral version is a quick-access menu for someone already
  //* using the bot, so "new here?" and Help/Feedback both feel slightly
  //* out of place there.
  if (!ephemeral) {
    children.push({ type: ComponentType.Separator })
    children.push({ type: ComponentType.TextDisplay, content: FOOTER })
  }

  const container: APIContainerComponent = {
    type: ComponentType.Container,
    accent_color: ACCENT_COLOR,
    components: children,
  }

  const components: (
    | APIContainerComponent
    | APIActionRowComponent<APIButtonComponentWithCustomId>
  )[] = [container]

  if (!ephemeral) {
    components.push(buildUtilityRow())
  }

  return {
    flags: ephemeral
      ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      : MessageFlags.IsComponentsV2,
    components,
  }
}
