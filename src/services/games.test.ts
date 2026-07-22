import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveGame } from './games'
import {
  searchGamesByTitle,
  lookupBySteamAppId,
  lookupByItadId,
} from '@/itad/client'
import type { ItadGame } from '@/types'
import { game } from '@/test/factories'

vi.mock('@/itad/client', () => ({
  searchGamesByTitle: vi.fn(),
  lookupBySteamAppId: vi.fn(),
  lookupByItadId: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveGame — Steam appid branch', () => {
  it('calls lookupBySteamAppId with a numeric query and returns [game] on a hit', async () => {
    vi.mocked(lookupBySteamAppId).mockResolvedValue(game)

    const result = await resolveGame('367520')

    expect(lookupBySteamAppId).toHaveBeenCalledWith(367520)
    expect(result).toEqual([game])
  })

  it('returns [] when lookupBySteamAppId finds nothing', async () => {
    vi.mocked(lookupBySteamAppId).mockResolvedValue(null)

    const result = await resolveGame('999999999')

    expect(result).toEqual([])
  })

  it('does not call the ITAD-ID or title-search paths for a numeric query', async () => {
    vi.mocked(lookupBySteamAppId).mockResolvedValue(game)

    await resolveGame('367520')

    expect(lookupByItadId).not.toHaveBeenCalled()
    expect(searchGamesByTitle).not.toHaveBeenCalled()
  })
})

describe('resolveGame — ITAD UUID branch', () => {
  const uuid = '018d937f-1ae9-734c-ba47-bd357cf07edd'

  it('calls lookupByItadId with a UUID query and returns [game] on a hit', async () => {
    vi.mocked(lookupByItadId).mockResolvedValue(game)

    const result = await resolveGame(uuid)

    expect(lookupByItadId).toHaveBeenCalledWith(uuid)
    expect(result).toEqual([game])
  })

  it('returns [] when lookupByItadId finds nothing', async () => {
    vi.mocked(lookupByItadId).mockResolvedValue(null)

    const result = await resolveGame(uuid)

    expect(result).toEqual([])
  })

  it('matches a UUID regardless of case (regex has the i flag)', async () => {
    vi.mocked(lookupByItadId).mockResolvedValue(game)

    await resolveGame(uuid.toUpperCase())

    expect(lookupByItadId).toHaveBeenCalledWith(uuid.toUpperCase())
  })

  it('does not call the Steam-appid or title-search paths for a UUID query', async () => {
    vi.mocked(lookupByItadId).mockResolvedValue(game)

    await resolveGame(uuid)

    expect(lookupBySteamAppId).not.toHaveBeenCalled()
    expect(searchGamesByTitle).not.toHaveBeenCalled()
  })
})

describe('resolveGame — title search fallback', () => {
  it('calls searchGamesByTitle for a non-numeric, non-UUID query', async () => {
    vi.mocked(searchGamesByTitle).mockResolvedValue([game])

    const result = await resolveGame('Hollow Knight')

    expect(searchGamesByTitle).toHaveBeenCalledWith('Hollow Knight')
    expect(result).toEqual([game])
  })

  it("passes through multiple matches unchanged (disambiguation is the caller's job)", async () => {
    const silksong: ItadGame = {
      ...game,
      id: '018d937f-1e67-708d-989d-b38bde2520fb',
      title: 'Hollow Knight: Silksong',
      slug: 'hollow-knight-silksong',
    }
    vi.mocked(searchGamesByTitle).mockResolvedValue([game, silksong])

    const result = await resolveGame('Hollow Knight')

    expect(result).toHaveLength(2)
  })

  it('passes through an empty array unchanged when nothing matches', async () => {
    vi.mocked(searchGamesByTitle).mockResolvedValue([])

    const result = await resolveGame('asdkfjhaskdjfh')

    expect(result).toEqual([])
  })

  it('does not call the Steam-appid or ITAD-ID paths for a title query', async () => {
    vi.mocked(searchGamesByTitle).mockResolvedValue([game])

    await resolveGame('Hollow Knight')

    expect(lookupBySteamAppId).not.toHaveBeenCalled()
    expect(lookupByItadId).not.toHaveBeenCalled()
  })
})
