import { verifyKey } from 'discord-interactions'
import { InteractionType, InteractionResponseType } from 'discord-api-types/v10'
import { commands } from '@/discord/commands'
import { components } from '@/discord/components'

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

  if (interaction.type === InteractionType.ApplicationCommand) {
    const handler = commands[interaction.data?.name as keyof typeof commands]
    if (!handler) return new Response('unknown command', { status: 400 })
    return Response.json(await handler(interaction))
  }

  if (interaction.type === InteractionType.MessageComponent) {
    //* custom_id convention: "prefix:rest" — prefix picks the handler,
    //* rest carries dynamic data (e.g. a page number) the handler parses itself.
    const prefix = interaction.data?.custom_id?.split(':')[0]
    const handler = components[prefix as keyof typeof components]
    if (!handler) return new Response('unknown component', { status: 400 })
    return Response.json(await handler(interaction))
  }

  return new Response('unhandled interaction type', { status: 400 })
}
