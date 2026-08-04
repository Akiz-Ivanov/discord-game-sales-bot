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
- [x] Enrich `/wishlist add` confirmation with current price (reuse
      `getGamePrices`) and set `wishlist_items.lastNotifiedPrice` to
      the current price at add-time when the game's already on sale —
      avoids an immediate redundant cron alert for a deal the user
      just saw seconds ago
  - `addGameToWishlist` (services/wishlist.ts) now calls `getGamePrices`
    itself, picks the cheapest deal via the new shared
    `lib/pickCheapestDeal.ts` helper (extracted from `services/cron.ts`,
    which had the same sort inline — now imported by both), and seeds
    `addWishlistItem`'s new optional `initialPrice` param only when
    that deal has `cut > 0`
  - `AddToWishlistResult` now carries the fetched `PriceSnapshot`
    alongside `status`, so the Discord layer doesn't need a second
    `getGamePrices` call to build a confirmation embed
  - both `/wishlist add` and its button-click counterpart
    (`handleWishlistAddSelect`) now render the same `buildPriceEmbed()`
    card `/price` uses on a successful add (ephemeral) — reuses the
    embed builder as-is, zero duplication; duplicate-add stays a plain
    one-line reply, no embed
  - verified live: an on-sale add correctly seeded `last_notified_price`
    in Postgres; a not-on-sale add left it `null`; a duplicate add
    fell back to plain text as expected
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

- [x] CI/CD via GitHub Actions — `test` job runs on every push/PR to
      `main`: spins up Postgres 16 + `local-neon-http-proxy` as service
      containers (mirrors docker-compose.yml), applies committed
      `drizzle/*.sql` migrations via `psql`, then runs lint + the full
      Vitest suite (183 tests)
  - had to align the workflow's Node version with local dev (24) —
    `npm ci`'s strict lockfile check resolved `esbuild`'s
    platform-specific optional deps differently under Node 22 vs 24,
    failing installs that were fine locally; added `.nvmrc` +
    `engines` in package.json so this can't silently drift again
  - job-level env vars for DISCORD_BOT_TOKEN/ITAD_API_KEY initially
    masked two tests asserting those vars are unset (each already
    manages its own value via `vi.stubEnv()`) — trimmed `env:` down
    to just DATABASE_URL/NODE_ENV
  - branch ruleset on `main`: requires the `test` status check,
    restricts force pushes/deletions, self added as bypass actor
    (solo dev — not requiring PRs for every change yet)
  - `npm audit` cleanup alongside: patched `brace-expansion` (clean
    fix) and bumped `next` 16.2.10 → 16.2.12 (patches several
    high-severity CVEs — SSRF, DoS in Server Actions). Remaining
    Next.js findings have no patched release yet upstream (advisory
    range spans nearly all of Next's history — `npm audit`'s only
    "fix" is downgrading to pre-App-Router 9.x, a regression, not a
    real fix); left as-is pending a real upstream patch. `esbuild`
    finding (via `drizzle-kit`'s `@esbuild-kit/*` chain) also left
    alone — dev-server-only risk, and the suggested fix downgrades
    `drizzle-kit`
  - Dependabot enabled: dependency graph, alerts, and security
    updates on via repo settings; `.github/dependabot.yml` added for
    weekly routine version-bump PRs (capped at 5 open at once)
- [x] Per-user wishlist size cap (100 games/user) — guards against
      scripted mass-add abuse without constraining real usage.
      `lib/constants.ts`'s `WISHLIST_LIMIT` + `wishlistLimitReachedMessage()`;
      `countWishlistItems` repo helper checked in `addGameToWishlist`
      before insert (before the ITAD price call — no wasted API call for
      an already-full wishlist). New `AddToWishlistResult` status:
      `'limit_reached'`, handled on both `/wishlist add` and its
      button-driven counterpart (`handleWishlistAddSelect`) with a
      friendly reply instead of a raw DB error. Full test coverage:
      repo (real Postgres), service (mocked, both branches), one
      assertion each in command/component test files.
- [x] `/wishlist list` overhaul — Components V2 (`Container`/`Section`/
      `TextDisplay`/`Separator`/`Button` accessory), replacing the old
      flat numbered text list. New `discord/views/wishlistList.ts`
      (`buildWishlistListMessage`) — one `Section` per game (bold title + subtext price line in a single merged `TextDisplay`, capped at
      8 items/page per the 40-component-per-message budget), each with
      an inline Remove button (`wishlist_item_remove:{gameId}`) via a
      new `handleWishlistItemRemove` component handler that re-fetches
      and re-renders the list on click (`InteractionResponseType.UpdateMessage`)
  - Live pricing: `/wishlist list` now shows the cheapest current deal
    per game, not just a static "added on" date. New
    `services/prices.ts`'s `getWishlistPrices()` — one batched ITAD
    call for the whole page (dedup'd by itadId), returns cheapest deal
    per game via existing `pickCheapestDeal`. Deliberately bypasses
    `getGamePrices`' same-day cache-READ for freshness, but still
    writes through to the cache so a `/price` lookup right after
    benefits. Crucially never touches `wishlist_items.lastNotifiedPrice`
    — that's cron/add-time-only, so viewing the list can't silently
    suppress a future sale alert.
  - `formatMoney` now returns `'Free'` instead of `'$0.00'`
  - Discount badge icon (custom emoji, circled caret) tried inline next
    to the title, in the price line, and dropped entirely after a live
    side-by-side comparison — the `(−80%)` text already communicates
    it clearly, and the icon read as clutter at 8-rows-repeated density
    (kept as-is on `/price`, where it's one-per-message, not repeated)
  - **Real bug found and fixed along the way**: `prices` table had no
    uniqueness constraint — repeat same-day price checks (e.g. from
    `/wishlist list`'s always-live fetch) were appending duplicate rows
    instead of updating, confirmed live (600+ duplicate rows found in
    prod Neon data, cleaned up via a one-time dedup + migration). Fixed
    at the schema level: new `checked_date` column +
    `prices_game_shop_date_idx` unique index on
    `(game_id, shop_id, checked_date)`; `savePrices`/`savePricesBulk`
    now upsert via `onConflictDoUpdate` instead of blind `INSERT`.
    `savePricesBulk` also dedupes its own input batch by
    `(gameId, shopId)` before insert — Postgres's `ON CONFLICT DO UPDATE` can't
    touch the same target row twice in one statement,
    and ITAD's own `deals` array isn't guaranteed shop-unique per game.
    New `db/buildConflictUpdateColumns.ts` helper (Drizzle's own
    documented pattern) generates the upsert `set` clause from real
    column names instead of hand-typed `excluded.x` strings — avoids a
    documented Drizzle footgun around camelCase/snake_case mismatches.
  - Full test coverage: `repositories/prices.test.ts` (upsert/dedup
    behavior against real Postgres), `services/prices.test.ts`
    (`getWishlistPrices`), `discord/views/wishlistList.test.ts` (new,
    100% coverage — component structure, price/title matching by game
    id not list order, 8-item cap, Free/no-deal/discount-line
    formatting), plus command/component handler coverage. 221/221
    passing project-wide.
  - **Not done yet, deliberately deferred**: pagination. Wishlist is
    capped at 8 games/page (component budget), real test wishlists
    have been at exactly 8 all session — no concrete need yet to build
    against. Next up.
- [x] `/wishlist list` pagination — Prev/Next buttons in a plain classic
      ActionRow below the Container (sibling component, not V2-specific).
      Component budget: `4N + 4 ≤ 40` → capped at 9 items/page, which
      lands exactly on Discord's 40-component ceiling when the nav row
      is showing (no headroom left on a paginated page for anything
      added later). Remove button's `custom_id` carries the current
      page (`wishlist_item_remove:{gameId}:{page}`) so removing an item
      re-renders the same page instead of bouncing to page 1; clamping
      (page too high/low, or the last item on the last page just got
      removed) happens once inside `buildWishlistListMessage`, so
      neither component handler needs its own clamp logic. New
      `discord/components/wishlist.ts`'s `handleWishlistListPage`
      (`wishlist_list_page:{page}`) mirrors `handleWishlistItemRemove`'s
      fetch → render shape, just without the remove step. Full test
      coverage: `wishlistList.test.ts` (slicing, clamping, nav-row
      visibility, disabled states, page indicator), component handler
      tests for both `handleWishlistItemRemove` and the new
      `handleWishlistListPage`. 232/232 passing project-wide.
  - **Not done yet, deliberately deferred**: Prev/Next currently use
    plain `◀ ▶` Unicode glyphs, not emoji — these can render as thin
    text-glyphs rather than filled triangles on some platforms.
    Candidate follow-up: swap to `⬅️ ➡️` (real emoji codepoints, render
    identically everywhere) or app-owned custom emoji matching the
    Remove button's trash-icon style for full visual consistency.
- [x] `/wishlist remove` pagination — same shape as `/wishlist list`'s,
      but capped by Discord's flat 25-option StringSelect limit instead
      of the 40-component budget (`MAX_REMOVE_OPTIONS_PER_PAGE`, a
      coincidentally-similar constant for an unrelated reason — kept
      separate from `wishlistList.ts`'s `MAX_ITEMS_PER_PAGE` rather than
      shared). New `discord/views/wishlistRemove.ts`
      (`buildWishlistRemoveMessage`) — genuinely new (StringSelect vs.
      V2 Container/Section, no shared render logic), but the pagination
      _mechanics_ generalized cleanly out of last session's list work:
  - `buildPaginationRow` (was local to `wishlistList.ts`) moved to
    `discord/interactions/buildPaginationRow.ts` and parameterized on
    `prefix`, so both `/wishlist list` and `/wishlist remove` share one
    Prev/indicator/Next builder instead of two near-identical copies
  - the clamp formula moved to `lib/paginate.ts` (`clampPage`,
    `getTotalPages`) — same reasoning
  - new component handler `handleWishlistRemovePage`
    (`wishlist_remove_page:{page}`), registered in
    `discord/components/index.ts` — mirrors `handleWishlistListPage`'s
    fetch → reslice → `UpdateMessage` shape, no removal step
  - `handleRemove` (command) shrinks to a thin wrapper around
    `buildWishlistRemoveMessage`, matching `handleList`'s shape
  - content line shows the visible range once paginated (e.g.
    "Select a game to remove (1–25 of 26):"), omitted on single-page
    wishlists to keep the common case unchanged
  - live-tested past 25 items via ngrok: nav row appears, Prev/Next
    reslice correctly, removal works from either page
  - full test coverage: `paginate.test.ts`, `buildPaginationRow.test.ts`,
    `wishlistRemove.test.ts` (new, 100%), plus command/component handler
    coverage. 254/254 passing project-wide.
- [x] Route-level error handling for `/api/interactions` — command and
      component dispatch in `route.ts` now wrap `handler(interaction)` in
      try/catch. Surfaced by a live ITAD 503 during add-heavy testing:
      an unhandled throw meant Discord's 3s timeout fired before any
      response went out, showing Discord's own generic "didn't respond
      in time" message instead of something actionable. Now catches at
      the two dispatch points (covers _any_ handler's unhandled throw,
      not just ITAD's), logs the real error server-side via
      `console.error` (only place to see the actual cause — Vercel
      function logs), and returns a friendly ephemeral
      "something went wrong, try again" as a real 200 response instead
      of letting Discord's timeout own the failure mode. Two new tests
      in `route.test.ts` covering both dispatch branches.
- [ ] Autocomplete on game search (Discord's native `autocomplete` option type — not a manual numbered list)
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

## Later / backlog

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
- [ ] Free/100%-off games tracking via GamerPower API — a second daily
      cron source alongside ITAD's sale checks. Start with no dedupe
      table (just post whatever's currently free each cron run) to see
      how repeat-posting actually feels in practice before deciding
      whether a `free_games_seen`-style table is worth the extra
      Postgres writes — open UX question, not an obvious yes on logging
      from day one this time.
- [ ] Bundles integration (ITAD `GET /games/bundles/v2`) — shape
      undecided, several directions on the table: (a) a "Show bundles"
      button on /price and /wishlist add embeds, separate lookup +
      separate embed on click; (b) surface a bundle proactively during
      the daily cron check when a wishlisted game appears in one; (c)
      fetch bundle data alongside the initial ITAD call but keep it
      collapsed until a user expands it. Needs to be prototyped/seen
      live before choosing, same posture as sale alert card v2.
- [ ] Additional `/config` subcommands (currency, stores, role) — deferred post-MVP
  - alert-visibility toggle: admin-set per-guild flag for whether sale
    alerts post as ephemeral or visible-to-all (some guilds may want
    alerts shareable/visible for group deal-hunting) — reads at
    buildSaleAlertMessage()/postChannelMessage() time
- [ ] Discord Developer Portal polish — bot avatar/icon, app
      description, permissions/OAuth scope review — relevant once
      global command registration and a wider invite are actually on
      the table, not urgent before that.
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
- [ ] Surface `/wishlist remove`'s select menu directly on the
      limit-reached reply — lets a user free a slot without a second
      command round-trip. Reuses the existing select-menu builder from
      handleRemove; no new state needed. Explicitly NOT auto-adding the
      pending game after a removal — keeps every wishlist mutation an
      explicit user action.
- [ ] "Add to wishlist" button on `/price` embed replies — now unblocked
      (`/wishlist add`/`addGameToWishlist` service both exist). Needs a
      per-user wishlist-membership check at embed-build time to decide
      button state (add vs. remove), and a `custom_id` carrying the
      ITAD ID.
- [ ] `/price` embed layout: reconsider Historical low's position — it
      currently sits alone on its own line above the 3-across
      Released/Reviews/Players inline-field row, which reads oddly.
      Options surfaced but undecided: drop Released to make room for
      Historical low in the 3-across row; find a different visual slot
      for Historical low; leave Released as-is and accept the awkward
      line. Needs to be looked at live with a few different games before
      deciding — some games won't have all fields populated (no
      historyLow if never on sale, no reviews if very new), so whatever
      layout is chosen needs to degrade gracefully when fields are
      missing.
- [ ] Per-user favorite/preferred stores for `/price` and `/wishlist list`
      — open-ended, not scoped yet. Motivating idea: some users only
      care about Steam/Epic/GOG and don't want smaller stores cluttering
      the deals list, even when a smaller store has the objectively best
      price. Design questions still open: a settings command to pick
      favorite stores vs. inferring from click/purchase behavior (no
      purchase tracking exists, so this leans toward explicit settings);
      whether to _filter_ to favorites only or _show favorites AND best
      deal as separate sections_ (a "best deal" callout plus a
      "your stores" section is more useful than pure filtering, but a
      second design/db question); storage shape (a new per-user table?
      an array column on `users`?) and how that interacts with
      `guilds`-scoped vs. `users`-scoped state, since favorites feel
      like a per-user preference, not a per-guild one, but the existing
      `guildId` on `users` is about last-touched-guild, not preferences.
      No decisions made — needs its own dedicated design session before
      any schema changes, given the db-cost sensitivity here.
- [ ] True end-to-end test for /api/interactions and /api/cron/price-check
      — real signed request (fake discord-interactions signing) through
      the full route → DB chain. Current coverage is unit tests with
      mocked boundaries + DB-backed repository integration tests; this
      would be the one missing tier. Not urgent, current coverage is
      97%+ and fast.
- [ ] Display price history (data's already being logged from MVP)
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
