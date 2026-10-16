import { deleteGuildByGuildId } from '@/repositories/guilds'

//* 50001 Missing Access: the bot was kicked, or lost view access to the
//* channel (confirmed live by kicking the dev bot).
//* 10003 Unknown Channel: the configured channel was deleted.
//* Deliberately NOT 50013 Missing Permissions: the bot is still in the
//* server, so an admin fixing permissions restores alerts without having
//* to reconfigure.
const UNREACHABLE_CODES = [10003, 50001]

//* postChannelMessage's error message ends with Discord's raw JSON body,
//* e.g. `... failed: 403 {"message": "Missing Access", "code": 50001}`.
//* rest.test.ts pins that format, so changing it there fails a test
//* instead of silently disabling this check.
export const isUnreachableChannelError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false
  const code = err.message.match(/"code":\s*(\d+)/)?.[1]
  return code !== undefined && UNREACHABLE_CODES.includes(Number(code))
}

//* `results` is the Promise.allSettled output for `guildIds`, in the same
//* order (allSettled preserves input order, which is what lets the two
//* arrays line up by index). Guilds whose post failed because the channel
//* can never be reached again are deleted so the crons stop retrying them
//* every run. Cleanup problems are logged, never thrown: a failed delete
//* must not turn a successful cron run into a 500.
export const pruneUnreachableGuilds = async (
  guildIds: string[],
  results: PromiseSettledResult<unknown>[]
): Promise<void> => {
  const unreachable = guildIds.filter((_, i) => {
    const result = results[i]
    return (
      result?.status === 'rejected' && isUnreachableChannelError(result.reason)
    )
  })

  const deletions = await Promise.allSettled(
    unreachable.map((guildId) => deleteGuildByGuildId(guildId))
  )

  deletions.forEach((deletion, i) => {
    if (deletion.status === 'rejected') {
      console.error(`Failed to prune guild ${unreachable[i]}:`, deletion.reason)
    } else if (deletion.value) {
      console.warn(`Pruned unreachable guild ${unreachable[i]}`)
    }
  })
}
