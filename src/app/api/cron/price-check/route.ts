import { getSaleAlerts } from '@/services/saleAlerts'
import { buildSaleAlertMessage } from '@/discord/views/saleAlert'
import { postChannelMessage } from '@/discord/rest'
import { updateLastNotifiedPrices } from '@/repositories/wishlist'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('unauthorized', { status: 401 })
  }

  const guildAlerts = await getSaleAlerts()

  const results = await Promise.allSettled(
    guildAlerts.map(async (guild) => {
      await postChannelMessage(
        guild.notificationChannelId,
        buildSaleAlertMessage(guild.alerts)
      )

      //* Only mark items notified once the post actually lands — if
      //* Discord rejects it (channel deleted, bot kicked), tomorrow's
      //* cron run should retry this guild at the same price rather than
      //* silently treating a failed send as delivered.
      await updateLastNotifiedPrices(
        guild.alerts.flatMap((alert) =>
          alert.recipients.map((r) => ({
            wishlistItemId: r.wishlistItemId,
            price: alert.deal.price.amountInt,
          }))
        )
      )
    })
  )

  const failed = results.filter((r) => r.status === 'rejected').length

  return Response.json({
    guildsNotified: guildAlerts.length - failed,
    guildsFailed: failed,
  })
}
