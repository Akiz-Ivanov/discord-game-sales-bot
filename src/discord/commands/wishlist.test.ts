import { describe, it, expect, vi, beforeEach } from 'vitest'
import { wishlist } from './wishlist'
import { resolveGame } from '@/services/games'
import { addGameToWishlist, getWishlist } from '@/services/wishlist'
import { getUserByDiscordId } from '@/repositories/users'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import {
  InteractionResponseType,
  MessageFlags,
  ApplicationCommandOptionType,
  ComponentType,
} from 'discord-api-types/v10'
import type { APIEmbed, APIInteractionResponse } from 'discord-api-types/v10'
import { game, makeGameRow, makeWishlistItemRow } from '@/test/factories'
import { buildPriceEmbed } from '../embeds/price'

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
    expect(resolveGame).not.toHaveBeenCalled()
  })

  it('reports no match found', async () => {
    vi.mocked(resolveGame).mockResolvedValue([])
    const data = expectChannelMessage(
      await wishlist(buildAddInteraction('nonexistent'))
    )
    expect(data.content).toBe(`Couldn't find a game matching "nonexistent".`)
    expect(addGameToWishlist).not.toHaveBeenCalled()
  })

  it('offers candidates as buttons (capped at 5) when multiple matches are found', async () => {
    const matches = Array.from({ length: 7 }, (_, i) => ({
      ...game,
      id: `id-${i}`,
      title: `Game ${i}`,
    }))
    vi.mocked(resolveGame).mockResolvedValue(matches)

    const data = expectChannelMessage(
      await wishlist(buildAddInteraction('game'))
    )

    expect(data.content).toContain('Multiple games found')
    expect(data.flags).toBe(MessageFlags.Ephemeral)
    const row = data.components?.[0]
    const buttons = row && 'components' in row ? row.components : []
    expect(buttons).toHaveLength(5)
    expect(buttons[0]).toMatchObject({
      type: ComponentType.Button,
      label: 'Game 0',
      custom_id: 'wishlist_add_select:id-0',
    })
    expect(addGameToWishlist).not.toHaveBeenCalled()
  })

  it('adds a single match, confirms, and includes the price embed', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    const snapshot = {
      deals: [],
      historyLowInt: 509,
      historyLowCurrency: 'USD',
    }
    vi.mocked(addGameToWishlist).mockResolvedValue({
      status: 'added',
      priceSnapshot: snapshot,
    })
    const fakeEmbed = { title: game.title } as APIEmbed
    vi.mocked(buildPriceEmbed).mockReturnValue(fakeEmbed)

    const data = expectChannelMessage(
      await wishlist(buildAddInteraction('hollow knight'))
    )

    expect(addGameToWishlist).toHaveBeenCalledWith(discordId, guildId, game)
    expect(buildPriceEmbed).toHaveBeenCalledWith(game, [], 509, 'USD')
    expect(data.content).toContain(`Added **${game.title}**`)
    expect(data.embeds).toEqual([fakeEmbed])
  })

  it('reports already-on-wishlist for a duplicate add without an embed', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({
      status: 'already_exists',
      priceSnapshot: {
        deals: [],
        historyLowInt: undefined,
        historyLowCurrency: undefined,
      },
    })

    const data = expectChannelMessage(
      await wishlist(buildAddInteraction('hollow knight'))
    )

    expect(data.content).toContain('already on your wishlist')
    expect(data.embeds).toBeUndefined()
    expect(buildPriceEmbed).not.toHaveBeenCalled()
  })

  it('reports the limit-reached message without an embed when the wishlist is full', async () => {
    vi.mocked(resolveGame).mockResolvedValue([game])
    vi.mocked(addGameToWishlist).mockResolvedValue({ status: 'limit_reached' })

    const data = expectChannelMessage(
      await wishlist(buildAddInteraction('hollow knight'))
    )

    expect(data.content).toContain('limit')
    expect(data.embeds).toBeUndefined()
    expect(buildPriceEmbed).not.toHaveBeenCalled()
  })
})

describe('wishlist command handler — list', () => {
  it('shows an empty-wishlist message when there are no items', async () => {
    vi.mocked(getWishlist).mockResolvedValue([])
    const data = expectChannelMessage(await wishlist(buildListInteraction()))
    expect(data.content).toContain('empty')
  })

  it('lists all wishlist items in order', async () => {
    vi.mocked(getWishlist).mockResolvedValue([
      makeWishlistItemRow({ game: makeGameRow({ title: 'Hollow Knight' }) }),
      makeWishlistItemRow({ game: makeGameRow({ title: 'Celeste' }) }),
    ])
    const data = expectChannelMessage(await wishlist(buildListInteraction()))
    expect(data.content).toContain('1. Hollow Knight')
    expect(data.content).toContain('2. Celeste')
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
})
