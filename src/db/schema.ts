import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// One row per Discord user who has interacted with the bot.
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    // Discord snowflake ID. Stored as text — it's a 64-bit number and
    // exceeds JS's safe integer range, so never store it as integer/bigint.
    discordId: text('discord_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_discord_id_idx').on(table.discordId)]
)

// One row per game we track. Canonical IDs only — never store a raw
// game-name string as the identity; title is display-only.
export const games = pgTable(
  'games',
  {
    id: serial('id').primaryKey(),
    // ITAD's own game ID (UUID) — the canonical cross-store identifier.
    itadId: uuid('itad_id').notNull(),
    // Steam App ID, when known — lets us look games up directly by appid
    // via ITAD's /games/lookup/v1 without a title search.
    steamAppId: integer('steam_app_id'),
    slug: text('slug').notNull(),
    title: text('title').notNull(), // display only
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('games_itad_id_idx').on(table.itadId)]
)

// A user's wishlist entry for a game. One row per (user, game) pair.
export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    // SQL-based notification dedup (per architecture notes — no Redis
    // needed at this scale). Stored in cents, same as prices.amountInt.
    // Null until the first alert has been sent for this wishlist entry.
    lastNotifiedPrice: integer('last_notified_price'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('wishlist_user_game_idx').on(table.userId, table.gameId),
  ]
)

// One row per (game, shop) per daily check — the full price history log.
// Logged from day one per TODO, even before anything displays it.
export const prices = pgTable('prices', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  shopId: integer('shop_id').notNull(), // ITAD's shop ID (e.g. 61 = Steam)
  shopName: text('shop_name').notNull(), // denormalized to skip a join for display
  // All money as integer cents (ITAD's `amountInt`) — never float.
  priceAmount: integer('price_amount').notNull(),
  regularAmount: integer('regular_amount').notNull(),
  cut: integer('cut').notNull(), // percent off, e.g. 34
  currency: text('currency').notNull(), // ISO 4217, e.g. "USD"
  url: text('url').notNull(), // ITAD affiliate deep link to the deal
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
})

// Relations — lets Drizzle's query API do `db.query.users.findMany({ with: { wishlistItems: true } })`
export const usersRelations = relations(users, ({ many }) => ({
  wishlistItems: many(wishlistItems),
}))

export const gamesRelations = relations(games, ({ many }) => ({
  wishlistItems: many(wishlistItems),
  prices: many(prices),
}))

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
  game: one(games, {
    fields: [wishlistItems.gameId],
    references: [games.id],
  }),
}))

export const pricesRelations = relations(prices, ({ one }) => ({
  game: one(games, {
    fields: [prices.gameId],
    references: [games.id],
  }),
}))
