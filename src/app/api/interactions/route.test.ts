import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { verifyKey } from 'discord-interactions'
import { InteractionType } from 'discord-api-types/v10'
import { commands } from '@/discord/commands'
import { components } from '@/discord/components'

vi.mock('discord-interactions', () => ({ verifyKey: vi.fn() }))
vi.mock('@/discord/commands', () => ({ commands: { ping: vi.fn() } }))
vi.mock('@/discord/components', () => ({
  components: { wishlist_remove_select: vi.fn() },
}))

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/interactions', {
    method: 'POST',
    headers: {
      'x-signature-ed25519': 'sig',
      'x-signature-timestamp': 'ts',
    },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/interactions', () => {
  it('returns 401 without calling any handler when the signature is invalid', async () => {
    vi.mocked(verifyKey).mockResolvedValue(false)

    const res = await POST(buildRequest({ type: InteractionType.Ping }))

    expect(res.status).toBe(401)
    expect(commands.ping).not.toHaveBeenCalled()
  })

  it('responds to Ping with Pong', async () => {
    vi.mocked(verifyKey).mockResolvedValue(true)

    const res = await POST(buildRequest({ type: InteractionType.Ping }))
    const body = await res.json()

    expect(body).toEqual({ type: 1 })
  })

  it('dispatches an ApplicationCommand interaction to the matching command handler', async () => {
    vi.mocked(verifyKey).mockResolvedValue(true)
    vi.mocked(commands.ping).mockResolvedValue({
      type: 4,
      data: { content: 'Pong!' },
    })

    const res = await POST(
      buildRequest({
        type: InteractionType.ApplicationCommand,
        data: { name: 'ping' },
      })
    )
    const body = await res.json()

    expect(commands.ping).toHaveBeenCalled()
    expect(body).toEqual({ type: 4, data: { content: 'Pong!' } })
  })

  it('returns 400 for an unregistered command name', async () => {
    vi.mocked(verifyKey).mockResolvedValue(true)

    const res = await POST(
      buildRequest({
        type: InteractionType.ApplicationCommand,
        data: { name: 'does-not-exist' },
      })
    )

    expect(res.status).toBe(400)
  })

  it('dispatches a MessageComponent interaction by its custom_id prefix', async () => {
    vi.mocked(verifyKey).mockResolvedValue(true)
    vi.mocked(components.wishlist_remove_select).mockResolvedValue({
      type: 7,
      data: { content: 'removed' },
    })

    const res = await POST(
      buildRequest({
        type: InteractionType.MessageComponent,
        data: { custom_id: 'wishlist_remove_select' },
      })
    )
    const body = await res.json()

    expect(components.wishlist_remove_select).toHaveBeenCalled()
    expect(body).toEqual({ type: 7, data: { content: 'removed' } })
  })

  it('returns 400 for an unregistered component prefix', async () => {
    vi.mocked(verifyKey).mockResolvedValue(true)

    const res = await POST(
      buildRequest({
        type: InteractionType.MessageComponent,
        data: { custom_id: 'does_not_exist:123' },
      })
    )

    expect(res.status).toBe(400)
  })

  it('returns 400 for an unhandled interaction type', async () => {
    vi.mocked(verifyKey).mockResolvedValue(true)

    const res = await POST(buildRequest({ type: 999 }))

    expect(res.status).toBe(400)
  })
})
