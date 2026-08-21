import { describe, it, expect, vi, beforeEach } from 'vitest'
import { wishlist } from './wishlist'
import { getWishlist } from '@/services/wishlist'
import { getUserByDiscordId } from '@/repositories/users'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import {
  InteractionResponseType,
  MessageFlags,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import type { APIInteractionResponse } from 'discord-api-types/v10'
import { makeGameRow, makeWishlistItemRow } from '@/test/factories'
import { getWishlistPrices } from '@/services/prices'
import { buildWishlistAddResponse } from '../interactions/buildWishlistAddResponse'

vi.mock('@/services/games', () => ({ resolveGame: vi.fn() }))
vi.mock('@/services/wishlist', () => ({
  addGameToWishlist: vi.fn(),
  getWishlist: vi.fn(),
  removeGameFromWishlist: vi.fn(),
}))
vi.mock('@/repositories/users', () => ({ getUserByDiscordId: vi.fn() }))
vi.mock('@/discord/interactions/getInteractionUserId', () => ({
  getInteractionUserId: vi.fn(),
}))
vi.mock('@/discord/interactions/getInteractionGuildId', () => ({
  getInteractionGuildId: vi.fn(),
}))
vi.mock('@/discord/embeds/price', () => ({ buildPriceEmbed: vi.fn() }))
vi.mock('@/services/prices', () => ({ getWishlistPrices: vi.fn() }))
vi.mock('@/discord/interactions/buildWishlistAddResponse', () => ({
  buildWishlistAddResponse: vi.fn(),
}))

const discordId = '255361746758402048'
const guildId = '999888777666555444'
const userRow = { id: 1, discordId, guildId, createdAt: new Date() }

const expectChannelMessage = (result: APIInteractionResponse) => {
  if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
    throw new Error(
      `Expected a ChannelMessageWithSource response, got type ${result.type}`
    )
  }
  if (!result.data) throw new Error('Expected response data to be present')
  return result.data
}

const buildAddInteraction = (query: string | null) =>
  ({
    data: {
      options: [
        {
          name: 'add',
          type: ApplicationCommandOptionType.Subcommand,
          options:
            query === null
              ? []
              : [
                  {
                    name: 'game',
                    type: ApplicationCommandOptionType.String,
                    value: query,
                  },
                ],
        },
      ],
    },
  }) as unknown as Parameters<typeof wishlist>[0]

const buildListInteraction = () =>
  ({
    data: {
      options: [
        {
          name: 'list',
          type: ApplicationCommandOptionType.Subcommand,
          options: [],
        },
      ],
    },
  }) as unknown as Parameters<typeof wishlist>[0]

const buildRemoveInteraction = () =>
  ({
    data: {
      options: [
        {
          name: 'remove',
          type: ApplicationCommandOptionType.Subcommand,
          options: [],
        },
      ],
    },
  }) as unknown as Parameters<typeof wishlist>[0]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getInteractionUserId).mockReturnValue(discordId)
  vi.mocked(getInteractionGuildId).mockReturnValue(guildId)
})

describe('wishlist command handler — add', () => {
  it('asks for a game when no query is provided', async () => {
    const data = expectChannelMessage(await wishlist(buildAddInteraction(null)))
    expect(data).toMatchObject({
      content: 'Please provide a game to add.',
      flags: MessageFlags.Ephemeral,
    })
    expect(buildWishlistAddResponse).not.toHaveBeenCalled()
  })

  it('delegates to buildWishlistAddResponse with the parsed query', async () => {
    vi.mocked(buildWishlistAddResponse).mockResolvedValue({
      content: 'fake response',
    })

    const data = expectChannelMessage(
      await wishlist(buildAddInteraction('hollow knight'))
    )

    expect(buildWishlistAddResponse).toHaveBeenCalledWith(
      'hollow knight',
      discordId,
      guildId,
      true
    )
    expect(data).toEqual({ content: 'fake response' })
  })
})

describe('wishlist command handler — list', () => {
  beforeEach(() => {
    vi.mocked(getWishlistPrices).mockResolvedValue(new Map())
  })

  it('shows an empty-wishlist message when there are no items', async () => {
    vi.mocked(getWishlist).mockResolvedValue([])
    const data = expectChannelMessage(await wishlist(buildListInteraction()))
    expect(data.content).toContain('empty')
    expect(getWishlistPrices).not.toHaveBeenCalled() //* empty branch returns before fetching prices
  })

  it('renders a Components V2 message with one Container for a non-empty wishlist', async () => {
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({
        game: makeGameRow({ id: 1, title: 'Hollow Knight' }),
      }),
      makeWishlistItemRow({ game: makeGameRow({ id: 2, title: 'Celeste' }) }),
    ])

    const result = await wishlist(buildListInteraction())

    if (result.type !== InteractionResponseType.ChannelMessageWithSource) {
      throw new Error(
        `Expected ChannelMessageWithSource, got type ${result.type}`
      )
    }
    expect(result.data?.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
    expect(result.data?.components).toHaveLength(1)
  })

  it('passes each wishlisted game to getWishlistPrices for the live price fetch', async () => {
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ id: 1, itadId: 'itad-1' }) }),
    ])

    await wishlist(buildListInteraction())

    expect(getWishlistPrices).toHaveBeenCalledWith([
      { gameDbId: 1, itadId: 'itad-1' },
    ])
  })
})

describe('wishlist command handler — remove', () => {
  it('reports an empty wishlist when the user has no user row yet', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(null)
    const data = expectChannelMessage(await wishlist(buildRemoveInteraction()))
    expect(data.content).toContain('empty')
    expect(getWishlist).not.toHaveBeenCalled()
  })

  it('reports an empty wishlist when the user exists but has no items', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    vi.mocked(getWishlist).mockResolvedValue([])
    const data = expectChannelMessage(await wishlist(buildRemoveInteraction()))
    expect(data.content).toContain('empty')
  })

  it('builds a select menu from the wishlist, capped at 25 options', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    const items = Array.from({ length: 30 }, (_, i) =>
      makeWishlistItemRow({
        id: i,
        game: makeGameRow({ id: i, title: `Game ${i}` }),
      })
    )
    vi.mocked(getWishlist).mockResolvedValue(items)

    const data = expectChannelMessage(await wishlist(buildRemoveInteraction()))

    expect(data.flags).toBe(MessageFlags.Ephemeral)
    const row = data.components?.[0]
    const select = row && 'components' in row ? row.components[0] : undefined
    const customId =
      select && 'custom_id' in select ? select.custom_id : undefined
    const options = select && 'options' in select ? select.options : undefined
    expect(customId).toBe('wishlist_remove_select')
    expect(options).toHaveLength(25)
  })

  it('adds a nav row when the wishlist exceeds 25 items', async () => {
    vi.mocked(getUserByDiscordId).mockResolvedValue(userRow)
    const items = Array.from({ length: 26 }, (_, i) =>
      makeWishlistItemRow({
        id: i,
        game: makeGameRow({ id: i, title: `Game ${i}` }),
      })
    )
    vi.mocked(getWishlist).mockResolvedValue(items)

    const data = expectChannelMessage(await wishlist(buildRemoveInteraction()))

    expect(data.components).toHaveLength(2)
  })
})
