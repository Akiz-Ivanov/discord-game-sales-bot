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
- [x] Unit test coverage for `repositories/games.ts`/`repositories/prices.ts`
      — against a real local Postgres (Docker + neon-proxy, see
      docker-compose.yml), since these call Drizzle's query builder
      directly and mocking it wouldn't test the actual SQL; TRUNCATE + RESTART IDENTITY CASCADE resets state between tests
- [x] `/price` reply as a real Discord embed — `buildPriceEmbed()`,
      replacing `formatDealsReply`'s plain-text output. Uses
      application-owned custom emoji (store logos, discount tier,
      historical-low icon — Discord Developer Portal → Emojis) and
      `Intl.NumberFormat` for currency display.
- [x] `/wishlist add|remove|list` — wired to DB, reuses `resolveGame()`
      from `services/games.ts`
  - `add`/`list` are plain ChannelMessageWithSource replies (ephemeral)
  - `remove` sends an ephemeral String Select menu built from the
    user's wishlist (capped at 25 — Discord's own select-menu limit;
    pagination not built yet, see v1.1)
  - selecting an option fires a MESSAGE_COMPONENT interaction, handled
    via a new `discord/components/` registry (mirrors `discord/commands/`
    but keyed by `custom_id` prefix, not command name) — `route.ts` now
    branches on `InteractionType.MessageComponent` alongside the
    existing `Ping`/`ApplicationCommand` branches
  - new: `repositories/users.ts`, `repositories/wishlist.ts`,
    `services/wishlist.ts`, `discord/interactions/getInteractionUserId.ts`
    (resolves the acting user's Discord ID from either a guild `member`
    or a bare DM `user` — guild-only today, but every component handler
    needs this same lookup so it's factored out now rather than later)
  - full Vitest coverage: repositories against local Postgres, services/
    commands/components mocked — 116 tests passing project-wide
- [x] `/price` embed enrichment + game-page link — extends
      `buildPriceEmbed()` with optional fields only present when a game
      was resolved via the ITAD-ID branch of `resolveGame()`
      (`lookupByItadId()` → `/games/info/v2`, which returns far more
      than search/v1 or lookup/v1): release date, review score
      (prefers Steam, falls back to the first source), player counts,
      and tags. `ItadGame`'s new fields (`appid`, `tags`, `releaseDate`,
      `developers`, `reviews`, `players`, `urls`) are all optional for
      exactly this reason — search/lookup paths simply leave them
      undefined, keeping those embeds as lean as before with zero
      branching on "which resolveGame path ran"
  - embed title links to the game's ITAD page (`urls.game`) when
    present — doubles as the "mention/link to IsThereAnyDeal.com"
    ITAD's ToS asks for, satisfied per-response for free
  - game ID moved out of a dedicated field into the embed footer
    (alongside the "+N more shops" note) — footer text is plain, not
    markdown, so this trades copy-on-click for less clutter; a
    reasonable trade once disambiguation stopped requiring anyone to
    manually copy/paste an ID (see next bullet)
- [x] Multiple-match disambiguation (both `/price` and `/wishlist add`)
      switched from a numbered text list of ITAD IDs to a button row —
      `buildGameSelectButtons()` (shared helper, `discord/interactions/`)
      builds up to 5 buttons keyed by ITAD ID in `custom_id` (e.g.
      `price_select:{uuid}`); new component handlers
      `discord/components/price.ts` (`price_select`) and
      `discord/components/wishlist.ts`'s `handleWishlistAddSelect`
      (`wishlist_add_select`) re-resolve the chosen game via
      `resolveGame()` on click — since the ID is UUID-shaped this
      naturally re-lands on the ITAD-ID branch, preserving the
      enrichment fields above instead of falling back to a lean result
  - `/price`'s picker stays public (non-ephemeral), matching the
    public final embed; `/wishlist add`'s stays ephemeral throughout,
    matching the rest of that command's private-by-design flow
  - caught and fixed a bug pre-commit: `/wishlist add`'s button row was
    built with the `price_select` prefix (copy-paste from `price.ts`),
    which would have routed clicks to the price flow instead of adding
    to the wishlist — a good example of why re-checking tests after a
    multi-file refactor is worth doing before committing, not after
- [ ] Enrich `/wishlist add` confirmation with current price (reuse
      `getGamePrices`) and set `wishlist_items.lastNotifiedPrice` to
      the current price at add-time when the game's already on sale —
      avoids an immediate redundant cron alert for a deal the user
      just saw seconds ago. Needs `addWishlistItem`'s signature to
      accept an optional initial price.
- [x] Daily price check (Vercel Cron, once/day) using ITAD batch endpoint
  - `POST /games/prices/v3`, up to 200 game IDs per request
  - rate limit: 1000 req / 5 min — not a concern at this scale
  - `services/cron.ts`'s `getSaleAlerts()`: pulls wishlisted rows via
    `repositories/wishlist.ts`'s `getWishlistedGamesByGuild()`, dedupes
    itadIds before the batch call, applies `shouldNotify` (moved to
    `lib/`, it's a pure helper), groups results by guild
  - `app/api/cron/price-check/route.ts`: gated on
    `Authorization: Bearer $CRON_SECRET` (env var set in Vercel,
    marked Sensitive; Vercel auto-attaches it on real scheduled
    invocations only — local testing needs a manual curl with the
    header)
- [x] Post sale alerts as Discord embeds
  - `discord/rest.ts`'s `postChannelMessage()` — first outbound-only
    Discord call (bot token via plain fetch), not a reply to an
    interaction
  - `discord/embeds/saleAlert.ts`'s `buildSaleAlertMessage()` — lean
    one-line-per-game embeds (price/discount/shop only, not /price's
    full multi-store breakdown), capped at 10 embeds/message with a
    "+N more" note, per Discord's own per-message embed limit
  - verified live end-to-end via ngrok: real alert posted to a
    `/config`-set channel for an actual on-sale wishlisted game

## v1.1

- [ ] Autocomplete on game search (Discord's native `autocomplete` option type — not a manual numbered list)
- [ ] Display price history (data's already being logged from MVP)
- [ ] Pagination for `/wishlist remove`'s select menu (only matters once
      a wishlist exceeds 25 items) — `custom_id` carries a page number
      (`wishlist_remove_page:2`), handler refetches `getWishlist` fresh
      and re-slices rather than caching state (cheap at this row count,
      no Vercel KV/Redis needed)

## Later / backlog

- [ ] Sale alert card v2 — first version is functional but bare
      (single-line embeds, no interactivity). Ideas surfaced but not
      decided: a "Check price" button per game (ephemeral reply,
      reusing resolveGame → getGamePrices → buildPriceEmbed — does NOT
      reuse handlePriceSelect's UpdateMessage pattern, since that would
      wipe every other game's card in the same alert message); a
      "Remove from wishlist" button (removeGameFromWishlist already
      exists); @mention strategy (per-game vs. one combined line) —
      needs to be seen live before deciding. Components V2 worth a
      second look specifically for this card shape (unlike /wishlist
      list's field-grid problem, a stacked list of games is exactly
      what V2's Container/Section model suits)
- [ ] User-defined notification thresholds (min % off, price ceiling, historical-low-only, store filter)
- [ ] Web dashboard (tracked games + price history, reusing the same service layer as the bot)
- [ ] Context-menu commands (type 2 "User" / type 3 "Message") — e.g. right-click a message → check price history
- [ ] Global command registration (once ready to invite the bot to other servers)
- [ ] "Add to wishlist" button on `/price` embed replies (Discord message component, same `/api/interactions` route, `MESSAGE_COMPONENT` type — build after `/price` and `/wishlist add` both work standalone)
- [x] Message-component buttons for disambiguation replies (instead of listing
      ITAD IDs as visible text) — button `custom_id` holds the UUID (well
      under Discord's 100-char limit), click re-runs price lookup via
      `MESSAGE_COMPONENT` interaction type on the same route. Kills the
      ugly-UUID-in-chat problem and the "retype the command" friction in
      one move. Natural to build alongside the existing "Add to wishlist"
      button item once `/wishlist add` exists.
- [ ] Components V2 (`Container`/`Section`/`TextDisplay`/`Separator`) for
      `/wishlist list` — lost to embeds for `/price` in a same-session
      side-by-side test (V2 has no inline-field-grid equivalent, so the
      release/reviews/players row collapsed into a taller stacked block),
      but a plain vertical item list is exactly what V2's stacking model
      suits. Could pair with colored Add/Remove buttons per item
      (`ButtonStyle.Success`/`Danger` — not V2-specific, works in the
      existing ActionRow system too)
- [ ] Import a user's existing ITAD Waitlist via OAuth (ITAD account linking — only relevant if/when someone wants to sync an existing ITAD waitlist instead of rebuilding it in Discord)
- [ ] Steam App ID backfill on `games` rows resolved via title/ITAD-ID search
      (currently only populated when a user types a numeric appid directly)
      — only worth doing once something actually reads it (autocomplete
      pre-seeding, cross-referencing, etc.); would use `/games/info/v2`'s
      `appid` field
- [ ] Enable `noUncheckedIndexedAccess` in tsconfig.json — surfaces
      unsafe array/tuple indexing project-wide (caught the
      `addWishlistItem`/`getUserByDiscordId` null-inference bug
      retroactively). Do as its own pass: flip flag, run
      `tsc --noEmit`, fix each site on its own merits.
- [ ] "Add to wishlist" button on `/price` embed replies — now unblocked
      (`/wishlist add`/`addGameToWishlist` service both exist). Needs a
      per-user wishlist-membership check at embed-build time to decide
      button state (add vs. remove), and a `custom_id` carrying the
      ITAD ID.
- [ ] True end-to-end test for /api/interactions and /api/cron/price-check
      — real signed request (fake discord-interactions signing) through
      the full route → DB chain. Current coverage is unit tests with
      mocked boundaries + DB-backed repository integration tests; this
      would be the one missing tier. Not urgent, current coverage is
      97%+ and fast.
- [ ] Docker + VPS migration (only if free-tier serverless is ever genuinely outgrown)

## Architecture notes

- Layer structure: `discord/` (transport — `discord/commands/` parses
  interactions, `discord/embeds/` builds embed replies) → `services/` →
  `repositories/` → `itad/`. `lib/` holds cross-cutting pure helpers
  (`formatMoney`) with no Discord/DB dependency, reusable by a future
  dashboard same as `services/`.
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
- Testing: Vitest (`environment: 'node'`, no jsdom needed — no frontend yet), tests co-located as `*.test.ts` next to source. `vitest.config.ts` uses `projects` to isolate `repositories/**` tests with `fileParallelism: false` (they share one real Postgres instance via Docker + neon-proxy; unit tests elsewhere mock everything and stay parallel). MSW for mocking ITAD HTTP calls, not yet used.
