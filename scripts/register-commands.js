import fs from 'node:fs'

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_TEST_GUILD_ID

//* Opt-in on purpose: global registration is the riskier action (it
//* affects every server the bot is in), so a plain `npm run
//* register-commands` keeps targeting the test guild only.
const isGlobal = process.argv.includes('--global')

const commandDefinitions = [
  {
    name: 'Quick access',
    type: 2, // USER command — no description, no options allowed
  },
  {
    name: 'help',
    description: 'Show available commands and how the bot works',
    type: 1,
  },
  {
    name: 'about',
    description: 'About this bot — what it does and where the data comes from',
    type: 1,
  },
  {
    name: 'forget-me',
    description: 'Permanently delete your wishlist and stored data',
    type: 1,
  },
  {
    name: 'privacy-policy',
    description: 'Show what data this bot stores and how to remove it',
    type: 1,
  },
  {
    name: 'feedback',
    description: 'Report a bug or suggest something for the bot',
    type: 1,
  },
  {
    name: 'free',
    description: 'Show currently free PC games',
    type: 1,
  },
  {
    name: 'trending',
    description: 'Show trending game deals right now',
    type: 1,
  },
  {
    name: 'bundles',
    description: 'Show currently active bundle deals',
    type: 1,
  },
  {
    name: 'price',
    description: 'Get the current price for a game',
    options: [
      {
        type: 3, //* STRING
        name: 'game',
        description: 'Game title to look up',
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: 'wishlist',
    description: 'Manage your game wishlist',
    options: [
      {
        type: 1, //* SUB_COMMAND — marks this as a subcommand
        name: 'add',
        description: 'Add a game to your wishlist',
        options: [
          {
            type: 3, //* STRING — free-text input, same as /price's "game" option
            name: 'game',
            description: 'Game title, Steam App ID, or ITAD ID to add',
            required: true, // Discord blocks submission until this is filled
            autocomplete: true,
          },
        ],
      },
      {
        type: 1,
        name: 'remove',
        description: 'Remove a game from your wishlist',
        //* no options — the select menu supplies the game, not typed text
      },
      {
        type: 1,
        name: 'list',
        description: 'Show your wishlist',
        //* no options — takes nothing, just shows everything
      },
    ],
  },
  {
    name: 'config',
    description: 'Configure server settings for this bot',
    default_member_permissions: '32',
    options: [
      {
        type: 1, //* SUB_COMMAND
        name: 'alerts-channel',
        description: 'Set the channel where sale alerts get posted',
        options: [
          {
            type: 7, //* CHANNEL
            name: 'channel',
            description: 'The channel to post alerts in',
            required: true,
            channel_types: [0], //* GUILD_TEXT only — no voice/category noise
          },
        ],
      },
      {
        type: 1, //* SUB_COMMAND
        name: 'remove-alerts',
        description: "Remove this server's alert configuration",
      },
    ],
  },
]

//* Guild-only for now (0 = guild). Global commands show up in DMs by
//* default, and several handlers (config, wishlist add) need a guild
//* and would throw in one. Set to [0, 1] to allow DMs later.
//* integration_types [0] = guild install only; the default also
//* enables user install, which would expose commands in servers where
//* the bot isn't a member.
const commands = commandDefinitions.map((c) => ({
  ...c,
  contexts: [0],
  integration_types: [0],
}))

async function registerCommands() {
  if (!APPLICATION_ID || !BOT_TOKEN) {
    throw new Error(
      'DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must both be set'
    )
  }
  if (!isGlobal && !GUILD_ID) {
    throw new Error(
      'DISCORD_TEST_GUILD_ID must be set for guild-scoped registration'
    )
  }

  const scope = isGlobal ? 'global' : 'guild'
  const url = isGlobal
    ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`
    : `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`

  console.log(
    `Registering ${commands.length} commands (${scope.toUpperCase()})`
  )

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to register commands: ${response.status} ${error}`)
  }

  const registered = await response.json()
  console.log('Registered:', registered)

  const idMap = Object.fromEntries(registered.map((c) => [c.name, c.id]))

  const fileContent = `// Auto-generated by scripts/register-commands.js — do not edit by hand.
// Scope: ${scope} commands (IDs differ between guild and global scope).
// Regenerate with \`npm run register-commands:global\` (or
// \`npm run register-commands\` for guild-scoped testing) any time a
// command is added, renamed, or removed.
export const COMMAND_IDS = ${JSON.stringify(idMap, null, 2)} as const
`

  fs.writeFileSync('src/discord/commandIds.ts', fileContent)
  console.log('Wrote src/discord/commandIds.ts')
}

//* A bare .catch(console.error) would log the error but still exit with
//* code 0, so a failed registration would look like a success to
//* anything checking the exit status. Exit non-zero instead.
registerCommands().catch((err) => {
  console.error(err)
  process.exit(1)
})
