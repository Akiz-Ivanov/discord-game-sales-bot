import { getSortedFreeGames } from '@/services/freeGames'
import { getGuildsWithNotificationChannel } from '@/repositories/guilds'
import { buildFreeGamesMessage } from '@/discord/views/freeGames'
import { postChannelMessage } from '@/discord/rest'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('unauthorized', { status: 401 })
  }

  const giveaways = await getSortedFreeGames()

  if (giveaways.length === 0) {
    return Response.json({
      guildsNotified: 0,
      guildsFailed: 0,
      activeGiveaways: 0,
    })
  }

  const guildsToNotify = await getGuildsWithNotificationChannel()
  const message = buildFreeGamesMessage(giveaways)

  const results = await Promise.allSettled(
    guildsToNotify.map((guild) =>
      postChannelMessage(guild.notificationChannelId, message)
    )
  )

  results.forEach((r) => {
    if (r.status === 'rejected')
      console.error('Free games post failed:', r.reason)
  })

  const failed = results.filter((r) => r.status === 'rejected').length

  return Response.json({
    guildsNotified: guildsToNotify.length - failed,
    guildsFailed: failed,
    activeGiveaways: giveaways.length,
  })
}
