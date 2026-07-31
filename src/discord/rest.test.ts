import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { postChannelMessage } from './rest'

const mockResponse = (
  overrides: Partial<Omit<Response, 'json' | 'text'>> & { data?: unknown } = {}
) => {
  const { data, ...rest } = overrides
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data ?? ''),
    ...rest,
  } as Response
}

beforeEach(() => {
  vi.stubEnv('DISCORD_BOT_TOKEN', 'test-token')
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('postChannelMessage', () => {
  it('throws before making a request when DISCORD_BOT_TOKEN is not set', async () => {
    vi.unstubAllEnvs()
    await expect(postChannelMessage('123', { content: 'hi' })).rejects.toThrow(
      'DISCORD_BOT_TOKEN is not set'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('POSTs to the correct channel URL with a Bot auth header', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: { id: 'msg-1' } }))

    await postChannelMessage('999', { content: 'sale!' })

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://discord.com/api/v10/channels/999/messages')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({
      Authorization: 'Bot test-token',
      'Content-Type': 'application/json',
    })
    expect(options?.body).toBe(JSON.stringify({ content: 'sale!' }))
  })

  it('returns the parsed response on success', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ data: { id: 'msg-1' } }))

    const result = await postChannelMessage('999', { content: 'sale!' })

    expect(result).toEqual({ id: 'msg-1' })
  })

  it('throws with status and body text when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ ok: false, status: 500, data: 'server error' })
    )

    await expect(postChannelMessage('999', { content: 'x' })).rejects.toThrow(
      'Discord postChannelMessage failed: 500'
    )
  })
})
