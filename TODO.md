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
- [x] Register ITAD app, get API key
- [x] `/price` command registered, stub handler wired end-to-end via typed
      command registry (`CommandHandler`, `discord-api-types`)
- [ ] `/price <game>` — real logic:
  - resolve input via ITAD: numeric input → `/games/lookup/v1` by Steam App ID
    (exact), otherwise → `/games/search/v1` by title (fuzzy, filtered to
    `type === "game"`)
  - if title search returns multiple matches, don't guess — reply listing
    each candidate's title + Steam App ID and ask the user to retry with a
    more specific title or the appid directly (same pattern as other ITAD
    Discord bots, e.g. Wishlist Doggo)
  - price lookup via `/games/prices/v3`; cache same-day result in `prices`
    table so a repeat `/price` call for the same game doesn't re-hit ITAD
- [ ] `/wishlist add|remove|list` — wired to DB, reuses the same resolve/
      disambiguate logic as `/price`
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
- [ ] Import a user's existing ITAD Waitlist via OAuth (ITAD account linking — only relevant if/when someone wants to sync an existing ITAD waitlist instead of rebuilding it in Discord)
- [ ] Docker + VPS migration (only if free-tier serverless is ever genuinely outgrown)

## Architecture notes

- Layer structure: `discord/` (transport — parses interactions, formats replies) → `services/` (business logic, Discord-agnostic) → `repositories/` (DB access) → `itad/` (thin ITAD API client, no business logic). Nothing in `services/` should know Discord exists — keeps a future dashboard/API a matter of calling the same services, not a rewrite.
- Discord HTTP Interactions, not a gateway bot — avoids needing an always-on host. Daily price checks don't need more than Vercel's free Hobby cron (capped at once/day anyway).
- Command handlers share one typed contract (`CommandHandler` in `src/types/discord.ts`, built on `discord-api-types` — not `discord-interactions`' own enums, which don't type-check against `discord-api-types`' response union). Registry: `src/discord/commands/index.ts`, a `Record<string, CommandHandler>`. `discord-interactions` is still used, just only for `verifyKey()`.
- Stack locked in: Next.js (App Router) + TS, Discord HTTP Interactions, Drizzle + Neon Postgres, Vercel Cron (daily), IsThereAnyDeal API, Vercel deploy, GitHub Actions for CI, Docker deferred until post-MVP, no Redis (SQL dedup via a `last_notified_price` column is enough).
- Testing: Vitest (`environment: 'node'`, no jsdom needed — no frontend yet), tests co-located as `*.test.ts` next to source. MSW for mocking ITAD HTTP calls where useful.
