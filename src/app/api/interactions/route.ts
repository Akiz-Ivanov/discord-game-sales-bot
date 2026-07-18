import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions'

export async function POST(req: Request) {
  const sig = req.headers.get('x-signature-ed25519')!
  const ts = req.headers.get('x-signature-timestamp')!
  const body = await req.text()

  const isValid = await verifyKey(
    body,
    sig,
    ts,
    process.env.DISCORD_PUBLIC_KEY!
  )
  if (!isValid) {
    return new Response('bad signature', { status: 401 })
  }

  const interaction = JSON.parse(body)
  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG })
  }
  if (interaction.data?.name === 'ping') {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Pong!' },
    })
  }
}
