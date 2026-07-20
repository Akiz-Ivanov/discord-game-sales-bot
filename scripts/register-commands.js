const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_TEST_GUILD_ID

const commands = [
  {
    name: 'ping',
    description: 'Replies with pong!',
    type: 1, // CHAT_INPUT (slash command)
  },
  {
    name: 'price',
    description: 'Get the current price for a game',
    options: [
      {
        type: 3, // STRING
        name: 'game',
        description: 'Game title to look up',
        required: true,
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
