import type {
  RESTPatchAPIInteractionOriginalResponseJSONBody,
  RESTPatchAPIInteractionOriginalResponseResult,
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

export const postChannelMessageWithFile = async (
  channelId: string,
  body: RESTPostAPIChannelMessageJSONBody,
  file: { filename: string; data: ArrayBuffer; contentType?: string }
): Promise<RESTPostAPIChannelMessageResult> => {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('DISCORD_BOT_TOKEN is not set')

  const form = new FormData()
  form.append('payload_json', JSON.stringify(body))

  form.append(
    'files[0]',
    new Blob([file.data], { type: file.contentType }),
    file.filename
  )

  const res = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    { method: 'POST', headers: { Authorization: `Bot ${token}` }, body: form }
  )

  if (!res.ok) {
    throw new Error(
      `Discord postChannelMessageWithFile failed: ${res.status} ${await res.text()}`
    )
  }
  return res.json()
}

export const editOriginalInteractionResponse = async (
  interactionToken: string,
  body: RESTPatchAPIInteractionOriginalResponseJSONBody
): Promise<RESTPatchAPIInteractionOriginalResponseResult> => {
  const appId = process.env.DISCORD_APPLICATION_ID
  if (!appId) throw new Error('DISCORD_APPLICATION_ID is not set')

  const res = await fetch(
    `${DISCORD_API_BASE}/webhooks/${appId}/${interactionToken}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    throw new Error(
      `Discord editOriginalInteractionResponse failed: ${res.status} ${await res.text()}`
    )
  }
  return res.json()
}
