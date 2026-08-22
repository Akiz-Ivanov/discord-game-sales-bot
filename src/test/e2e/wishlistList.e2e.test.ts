import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import {
  InteractionType,
  ApplicationCommandOptionType,
  ComponentType,
} from 'discord-api-types/v10'
import { POST } from '@/app/api/interactions/route'
import { buildSignedRequest } from '@/test/e2e/signInteraction'
import { server } from '@/test/e2e/setup'
import { db } from '@/db'
import { games, users, wishlistItems, prices } from '@/db/schema'
import multiGameFixture from '@/test/e2e/fixtures/itad/prices-multi-game.json'

const GUILD_ID = 'guild-1'
const DISCORD_USER_ID = 'user-1'

const buildListInteraction = () => ({
  type: InteractionType.ApplicationCommand,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  data: {
    name: 'wishlist',
    options: [
      {
        name: 'list',
        type: ApplicationCommandOptionType.Subcommand,
        options: [],
      },
    ],
  },
})

const buildListPageInteraction = (page: number) => ({
  type: InteractionType.MessageComponent,
  guild_id: GUILD_ID,
  member: { user: { id: DISCORD_USER_ID } },
  message: { id: 'msg-1' },
  data: {
    custom_id: `wishlist_list_page:${page}`,
    component_type: ComponentType.Button,
  },
})

const REAL_GAME_IDS = [
  '018d937f-6136-71e4-a7d4-088a2e8f58ad', // Baldur's Gate 3, going by 5999 price
  '018d937e-f524-7384-a34a-0a765b70ff42',
  '018d937f-1609-7272-a6c7-61100a9fd54c', // note: 0-price/flag "H" entries
  '018d937f-0fa6-72ce-88cc-960788c91718',
  '018d937f-0400-73d0-ae3f-c3abaef35ef2',
  '018d937f-6d49-737c-83f6-b6baf3f3bfbf',
  '018d937e-fef7-7274-bbce-e7d155c3d2d1',
  '018d937f-1586-73b9-9952-4e4fb7c35dc3',
  '018d937f-1e7d-701d-838a-073a4af232c9',
  '018d937f-2db9-7369-8fb1-3f104d3341b8',
]

const seedTenWishlistedGames = async () => {
  const [userRow] = await db
    .insert(users)
    .values({ discordId: DISCORD_USER_ID, guildId: GUILD_ID })
    .returning()

  const gameRows = await db
    .insert(games)
    .values(
      REAL_GAME_IDS.map((itadId, i) => ({
        itadId,
        slug: `game-${i + 1}`,
        title: `Game ${i + 1}`,
      }))
    )
    .returning()

  await db
    .insert(wishlistItems)
    .values(gameRows.map((g) => ({ userId: userRow!.id, gameId: g.id })))

  return { userRow, gameRows }
}

describe('POST /api/interactions — /wishlist list pagination (e2e)', () => {
  it('shows page 1 sorted by discount and writes live prices to the cache', async () => {
    server.use(
      http.post('https://api.isthereanydeal.com/games/prices/v3', () =>
        HttpResponse.json(multiGameFixture)
      )
    )

    await seedTenWishlistedGames()

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildListInteraction()
      )
    )
    const body = await res.json()

    const container = body.data.components[0]
    const sections = container.components.filter(
      (c: { type: number }) => c.type === ComponentType.Section
    )
    expect(sections).toHaveLength(9) // MAX_ITEMS_PER_PAGE

    //* game-5 has cut: 75, the highest discount — should sort first.
    expect(sections[0].components[0].content).toContain('Game 5')

    //* Nav row present since 10 items > 9-per-page.
    expect(body.data.components).toHaveLength(2)

    //* Confirms getWishlistPrices' side-write to the prices cache.
    const priceRows = await db.select().from(prices)
    expect(priceRows.length).toBeGreaterThan(0)
  })

  it('shows the remaining item on page 2 via wishlist_list_page click', async () => {
    server.use(
      http.post('https://api.isthereanydeal.com/games/prices/v3', () =>
        HttpResponse.json(multiGameFixture)
      )
    )

    await seedTenWishlistedGames()

    const res = await POST(
      buildSignedRequest(
        'http://localhost/api/interactions',
        buildListPageInteraction(1)
      )
    )
    const body = await res.json()

    const container = body.data.components[0]
    const sections = container.components.filter(
      (c: { type: number }) => c.type === ComponentType.Section
    )
    expect(sections).toHaveLength(1)
  })
})
