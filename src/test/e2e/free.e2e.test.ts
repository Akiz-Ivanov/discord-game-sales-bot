import { describe, it, expect } from 'vitest'
import { InteractionType } from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'

const GUILD_ID = 'guild-1'
const DISCORD_USER_ID = 'user-1'

const buildFreeInteraction = () => ({
  type: InteractionType.ApplicationCommand,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  data: { name: 'free', options: [] },
})

describe('POST /api/interactions — /free (e2e)', () => {
  it('falls back to the generic error response when after() has no request scope', async () => {
    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildFreeInteraction()
      )
    )
    const body = await res.json()

    //* Known harness limitation, not an app bug — identical root cause to
    //* feedback.e2e.test.ts's screenshot-path test: next/server's after()
    //* depends on Next's own request-scoped AsyncLocalStorage context,
    //* which only exists when dispatched through a real running Next
    //* server. Calling the route handler directly (as every e2e test here
    //* does) has no such context, so after() throws synchronously and
    //* route.ts's catch block returns its generic fallback instead of the
    //* real DeferredChannelMessageWithSource ack. The command's actual
    //* deferred behavior is already covered by the mocked unit tests in
    //* commands/free.test.ts, which stub next/server entirely for exactly
    //* this reason.
    expect(body.type).toBe(4) // ChannelMessageWithSource (route's catch fallback)
    expect(body.data.content).toContain('Something went wrong')
  })
})
