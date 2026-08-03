import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uuid,
  uniqueIndex,
  date,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// One row per Discord user who has interacted with the bot.
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(), // Discord snowflake ID. Stored as text — it's a 64-bit number and
    discordId: text('discord_id').notNull(),
    // Which guild this user last touched a /wishlist command in — alerts
    // go here. Nullable: a user created via /price (which never calls
    // upsertUser) or before this column existed won't have one yet.
    guildId: text('guild_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_discord_id_idx').on(table.discordId)]
)

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
    historyLowAmount: integer('history_low_amount'),
    historyLowCurrency: text('history_low_currency'),
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
export const prices = pgTable(
  'prices',
  {
    id: serial('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    shopId: integer('shop_id').notNull(),
    shopName: text('shop_name').notNull(),
    priceAmount: integer('price_amount').notNull(),
    regularAmount: integer('regular_amount').notNull(),
    cut: integer('cut').notNull(),
    currency: text('currency').notNull(),
    url: text('url').notNull(),
    //* UTC calendar day of this check — drives the one-row-per-shop-per-day
    //* guarantee below. Separate from checkedAt (a precise timestamp) since
    //* the uniqueness needs to be on the *day*, not the moment.
    checkedDate: date('checked_date').notNull(),
    checkedAt: timestamp('checked_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('prices_game_shop_date_idx').on(
      table.gameId,
      table.shopId,
      table.checkedDate
    ),
  ]
)

export const guilds = pgTable(
  'guilds',
  {
    id: serial('id').primaryKey(),
    guildId: text('guild_id').notNull(), // Discord guild snowflake
    notificationChannelId: text('notification_channel_id'), // null until /set-channel is run
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('guilds_guild_id_idx').on(table.guildId)]
)

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
