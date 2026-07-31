import { getSaleAlerts } from '@/services/cron'
import { buildSaleAlertMessage } from '@/discord/embeds/saleAlert'
import { postChannelMessage } from '@/discord/rest'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  //* !cronSecret guards against an unset env var accidentally matching
  //* an empty/missing header — fail closed, not open.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('unauthorized', { status: 401 })
  }

  const guildAlerts = await getSaleAlerts()

  //* allSettled, not Promise.all — one guild's post failing (bot kicked,
  //* channel deleted since /config was run) shouldn't block alerts to
  //* every other guild in the same run.
  const results = await Promise.allSettled(
    guildAlerts.map((guild) =>
      postChannelMessage(
        guild.notificationChannelId,
        buildSaleAlertMessage(guild.alerts)
      )
    )
  )

  const failed = results.filter((r) => r.status === 'rejected').length

  return Response.json({
    guildsNotified: guildAlerts.length - failed,
    guildsFailed: failed,
  })
}
