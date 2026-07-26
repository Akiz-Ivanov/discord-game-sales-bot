const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_TEST_GUILD_ID

const commands = [
  {
    name: 'ping',
    description: 'Replies with pong!',
    type: 1, //* CHAT_INPUT (slash command)
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
]

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`

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

  console.log('Registered:', await response.json())
}

registerCommands().catch(console.error)
