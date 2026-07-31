import type {
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageResult,
} from 'discord-api-types/v10'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

export const postChannelMessage = async (
  channelId: string,
  body: RESTPostAPIChannelMessageJSONBody
): Promise<RESTPostAPIChannelMessageResult> => {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('DISCORD_BOT_TOKEN is not set')

  const res = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    throw new Error(
      `Discord postChannelMessage failed: ${res.status} ${await res.text()}`
    )
  }

  return res.json()
}
