# Discord Game Sales Bot — TODO

## Setup (done)

- [x] Next.js + TypeScript + Tailwind + ESLint + Prettier scaffolded
- [x] Discord app created, bot invited to test server (guild-scoped commands)
- [x] `/api/interactions` route: verifies Discord's ed25519 signature, handles PING
- [x] Deployed to Vercel, env vars set (DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID)
- [x] `/ping` command registered and working end-to-end

## MVP

- [x] New Neon project (separate from blogs-db — free quotas are per-project)
- [x] Drizzle schema: `users`, `games`, `wishlist_items`, `prices`
  - store canonical IDs (ITAD ID / Steam App ID), never raw game name text
  - log a `prices` row on every daily check from day one, even before it's displayed anywhere
  - `games` also carries `historyLowAmount`/`historyLowCurrency` (nullable) — a
    cache of ITAD's `historyLow.all`, refreshed on every live fetch so a
    cache-hit reply can still show it without re-calling ITAD
- [x] Register ITAD app, get API key
- [x] `/price` command registered, stub handler wired end-to-end via typed
      command registry (`CommandHandler`, `discord-api-types`)
- [x] `/price <game>` — real logic:
  - resolve input via `services/games.ts`'s `resolveGame()`: Steam App ID
    (numeric input, exact) → ITAD ID (UUID input, exact, via
    `/games/info/v2` — lets a user paste back an ID from a previous reply)
    → fuzzy title search (fallback, filtered to `type === "game"`)
  - if title search returns multiple matches, don't guess — reply listing
    each candidate's title + ITAD ID (capped at 5) and ask the user to
    retry with a more specific title or an ID directly (same pattern as
    other ITAD Discord bots, e.g. Wishlist Doggo)
  - reply shows cheapest-first deals (capped at 5 shops), sale/no-sale
    framing, historical low, and the game's ITAD ID as a copyable code
    block
  - `formatMoney`/`formatDealsReply` live in `discord/format/deals.ts`,
    covered by Vitest unit tests
- [x] `/price` same-day price caching — `repositories/prices.ts`
      (`getCachedPrices`/`savePrices`) checks the `prices` table before
      calling ITAD; `services/prices.ts`'s `getGamePrices()` is the
      cache-aside entry point, so `/price` doesn't need to know caching
      exists at all
- [x] Unit test coverage for `services/games.ts` (`resolveGame`) and
      `services/prices.ts` (`getGamePrices`) — mocked via `vi.mock()`
      against `itad/client`/`repositories/prices`, not MSW
- [x] Unit test coverage for `itad/client.ts` — `vi.stubGlobal('fetch')`,
      covers URL/param construction, response parsing, error paths
- [ ] Unit test coverage for `repositories/games.ts`/`repositories/prices.ts`
      — blocked on a real (test) Postgres instance rather than mocks,
      since these call Drizzle's query builder directly; likely means
      Docker Postgres, not yet set up
- [ ] `/wishlist add|remove|list` — wired to DB, reuses `resolveGame()`
      from `services/games.ts` (extracted early specifically for this)
- [ ] Daily price check (Vercel Cron, once/day) using ITAD batch endpoint
  - `POST /games/prices/v3`, up to 200 game IDs per request
  - rate limit: 1000 req / 5 min — not a concern at this scale
- [ ] Post sale alerts as Discord embeds

## v1.1

- [ ] Autocomplete on game search (Discord's native `autocomplete` option type — not a manual numbered list)
- [ ] Display price history (data's already being logged from MVP)

## Later / backlog

- [ ] User-defined notification thresholds (min % off, price ceiling, historical-low-only, store filter)
- [ ] Web dashboard (tracked games + price history, reusing the same service layer as the bot)
- [ ] Context-menu commands (type 2 "User" / type 3 "Message") — e.g. right-click a message → check price history
- [ ] Global command registration (once ready to invite the bot to other servers)
- [ ] "Add to wishlist" button on `/price` embed replies (Discord message component, same `/api/interactions` route, `MESSAGE_COMPONENT` type — build after `/price` and `/wishlist add` both work standalone)
- [ ] Message-component buttons for disambiguation replies (instead of listing
      ITAD IDs as visible text) — button `custom_id` holds the UUID (well
      under Discord's 100-char limit), click re-runs price lookup via
      `MESSAGE_COMPONENT` interaction type on the same route. Kills the
      ugly-UUID-in-chat problem and the "retype the command" friction in
      one move. Natural to build alongside the existing "Add to wishlist"
      button item once `/wishlist add` exists.
- [ ] Import a user's existing ITAD Waitlist via OAuth (ITAD account linking — only relevant if/when someone wants to sync an existing ITAD waitlist instead of rebuilding it in Discord)
- [ ] Steam App ID backfill on `games` rows resolved via title/ITAD-ID search
      (currently only populated when a user types a numeric appid directly)
      — only worth doing once something actually reads it (autocomplete
      pre-seeding, cross-referencing, etc.); would use `/games/info/v2`'s
      `appid` field
- [ ] Docker + VPS migration (only if free-tier serverless is ever genuinely outgrown)

## Architecture notes

- Layer structure, now actually implemented (not just aspirational):
  `discord/` (transport — `discord/commands/` parses interactions,
  `discord/format/` builds replies) → `services/` (business logic,
  Discord-agnostic — `services/games.ts`'s `resolveGame()`,
  `services/prices.ts`'s `getGamePrices()`) → `repositories/` (DB access —
  `repositories/games.ts`'s `upsertGame()`, `repositories/prices.ts`'s
  `getCachedPrices`/`savePrices`) → `itad/` (thin API client, no business
  logic — `searchGamesByTitle`, `lookupBySteamAppId`, `lookupByItadId`,
  `getPrices`). Nothing in `services/` should know Discord exists — keeps
  a future dashboard/API a matter of calling the same services, not a
  rewrite.
- Discord HTTP Interactions, not a gateway bot — avoids needing an always-on host. Daily price checks don't need more than Vercel's free Hobby cron (capped at once/day anyway).
- Command handlers share one typed contract (`CommandHandler`, defined in
  `src/types/discord.ts`, built on `discord-api-types` — not
  `discord-interactions`' own enums, which don't type-check against
  `discord-api-types`' response union). `src/types/index.ts` barrel-exports
  `discord.ts` + `itad.ts` — import from `@/types` rather than the
  individual files. Registry: `src/discord/commands/index.ts`, a
  `Record<string, CommandHandler>`. `discord-interactions` is still used,
  just only for `verifyKey()`.
- Stack locked in: Next.js (App Router) + TS, Discord HTTP Interactions, Drizzle + Neon Postgres, Vercel Cron (daily), IsThereAnyDeal API, Vercel deploy, GitHub Actions for CI, Docker deferred until post-MVP, no Redis (SQL dedup via a `last_notified_price` column is enough).
- Testing: Vitest (`environment: 'node'`, no jsdom needed — no frontend yet), tests co-located as `*.test.ts` next to source. MSW for mocking ITAD HTTP calls where useful.
