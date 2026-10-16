import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isUnreachableChannelError,
  pruneUnreachableGuilds,
} from './pruneUnreachableGuilds'
import { deleteGuildByGuildId } from '@/repositories/guilds'

vi.mock('@/repositories/guilds', () => ({ deleteGuildByGuildId: vi.fn() }))

const discordError = (status: number, code: number) =>
  new Error(
    `Discord postChannelMessage failed: ${status} {"message": "x", "code": ${code}}`
  )

const rejected = (code: number): PromiseRejectedResult => ({
  status: 'rejected',
  reason: discordError(403, code),
})
const fulfilled: PromiseFulfilledResult<unknown> = {
  status: 'fulfilled',
  value: {},
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(deleteGuildByGuildId).mockResolvedValue(true)
})

describe('isUnreachableChannelError', () => {
  it('is true for 50001 Missing Access (bot kicked)', () => {
    expect(isUnreachableChannelError(discordError(403, 50001))).toBe(true)
  })

  it('is true for 10003 Unknown Channel (channel deleted)', () => {
    expect(isUnreachableChannelError(discordError(404, 10003))).toBe(true)
  })

  it('is false for 50013 Missing Permissions (bot still present)', () => {
    expect(isUnreachableChannelError(discordError(403, 50013))).toBe(false)
  })

  it('is false when the message has no JSON error code', () => {
    expect(
      isUnreachableChannelError(
        new Error('Discord postChannelMessage failed: 502 <html>Bad Gateway')
      )
    ).toBe(false)
  })

  it('is false for non-errors', () => {
    expect(isUnreachableChannelError('50001')).toBe(false)
    expect(isUnreachableChannelError(undefined)).toBe(false)
  })
})

describe('pruneUnreachableGuilds', () => {
  it('deletes only the guilds whose own post failed as unreachable', async () => {
    await pruneUnreachableGuilds(
      ['g1', 'g2', 'g3'],
      [fulfilled, rejected(50001), fulfilled]
    )

    expect(deleteGuildByGuildId).toHaveBeenCalledTimes(1)
    expect(deleteGuildByGuildId).toHaveBeenCalledWith('g2')
  })

  it('leaves guilds alone when the failure is not an unreachable-channel code', async () => {
    await pruneUnreachableGuilds(
      ['g1', 'g2'],
      [
        rejected(50013),
        { status: 'rejected', reason: new Error('network down') },
      ]
    )

    expect(deleteGuildByGuildId).not.toHaveBeenCalled()
  })

  it('does not throw when a delete fails', async () => {
    vi.mocked(deleteGuildByGuildId).mockRejectedValue(new Error('db down'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      pruneUnreachableGuilds(['g1'], [rejected(50001)])
    ).resolves.toBeUndefined()

    consoleSpy.mockRestore()
  })
})
