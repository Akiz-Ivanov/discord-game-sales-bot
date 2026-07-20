import { verifyKey } from 'discord-interactions'
import { InteractionType, InteractionResponseType } from 'discord-api-types/v10'
import { commands } from '@/discord/commands'

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
  if (!isValid) return new Response('bad signature', { status: 401 })

  const interaction = JSON.parse(body)
  if (interaction.type === InteractionType.Ping) {
    return Response.json({ type: InteractionResponseType.Pong })
  }

  const handler = commands[interaction.data?.name as keyof typeof commands]
  if (!handler) return new Response('unknown command', { status: 400 })

  const response = await handler(interaction)
  return Response.json(response)
}
