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
  - **Not done yet, deliberately deferred**: Prev/Next currently use
    plain `◀ ▶` Unicode glyphs, not emoji — these can render as thin
    text-glyphs rather than filled triangles on some platforms.
    Candidate follow-up: swap to `⬅️ ➡️` (real emoji codepoints, render
    identically everywhere) or app-owned custom emoji matching the
    Remove button's trash-icon style for full visual consistency.
    Same treatment candidate for the wishlist toggle button's ➕/➖.
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
- [x] Autocomplete on game search — new `discord/autocomplete/`
      registry (mirrors `discord/commands/`/`discord/components/`,
      keyed by command name) dispatched from a new
      `ApplicationCommandAutocomplete` branch in `route.ts`. Shared
      handler (`handleGameSearchAutocomplete`) wired to both /price's
      and /wishlist add's "game" option via `autocomplete: true` in
      register-commands.js.
  - Hits ITAD's `searchGamesByTitle()` directly, never the DB — the
    `games` table only has rows for previously-resolved titles, and
    querying Neon per-keystroke would be the worst pattern for
    CU-hour billing (sparse queries repeatedly wake a suspended
    compute and reset its idle timer). Confirmed zero DB impact live.
  - `AUTOCOMPLETE_MIN_QUERY_LENGTH = 3` gates the ITAD call — new
    `getFocusedOption.ts` helper walks the (possibly subcommand-
    nested) options tree to find the focused value. No local
    debounce built; Discord's own client-side behavior handles
    request volume well enough in practice (confirmed live: ITAD's
    `/games/search/v1` usage barely moved under repeated testing,
    dashboard still reads 0.13% avg usage of the 1000/5min app-wide
    limit, shared with /price, /wishlist add, and cron).
  - Selecting a suggestion round-trips the ITAD UUID as the choice
    `value`, so `resolveGame()` lands on the enriched
    `lookupByItadId` branch on submit — same richer embed as pasting
    an ID back manually, for free.
  - Considered a "keep typing…" placeholder for the below-threshold
    empty state; skipped — Discord's own native
    "No options match your search" empty state already covers this
    fine, confirmed live.
  - Full test coverage: `getFocusedOption.test.ts`,
    `gameSearch.test.ts`, route dispatch tests (success, unknown
    command, handler-throws branches). 269/269 passing project-wide.
- [x] Sale alert card v2 — grouped by (guild, game) instead of one
      row per (user, guild) — fixes a real bug where two users
      wishlisting the same game produced two duplicate cards for
      the same sale. New `discord/views/saleAlert.ts`
      (`buildSaleAlertMessage`) — Components V2, one Container per
      message, one Section per game, accent color matches the
      existing on-sale green. Capped at `MAX_ALERTS_PER_MESSAGE = 9`
      (component budget, same math as `/wishlist list`'s 9-item cap)
      with a "+N more sales not shown" note.
  - Each game's Section mentions every recipient who wishlisted it
    (`Wishlisted by @user1 @user2...`, capped at 10 with a "+N more"
    tail), `allowed_mentions` scoped to exactly those recipients.
    Header count is guild-wide ("N wishlisted games are on sale"),
    not personalized — corrected from an earlier "on your wishlist"
    wording that was misleading once per-game mentions made
    per-user ownership visible in the card itself.
  - Each Section carries a "Check price" accessory button
    (`sale_check_price:{itadId}`) — new
    `discord/components/saleAlert.ts`, reuses
    `resolveGame → getGamePrices → buildPriceEmbed`. Always replies
    with a fresh ephemeral message, never `UpdateMessage` — the
    alert is shared by the whole channel, so rewriting it on one
    person's click would erase it for everyone else who hasn't
    clicked yet.
  - "Remove from wishlist" accessory considered and dropped for v1
    — a Section allows only one accessory (button or thumbnail),
    and Check-price felt like the more urgent action right after a
    ping (surfaces the full multi-store breakdown the lean alert
    card deliberately omits); `/wishlist remove` already covers
    removal.
  - **Real bug fixed alongside**: nothing previously wrote
    `lastNotifiedPrice` back after a cron alert fired, so an
    unchanged sale would re-notify every single day. New
    `updateLastNotifiedPrices()` repo helper, called from the cron
    route once a guild's post succeeds (skipped on a failed post,
    so tomorrow's run retries that guild rather than treating a
    failed send as delivered).
  - `shouldNotify` tightened from "any price change" to "genuine
    improvement" (`currentPrice < lastNotifiedPrice`) — a shrinking
    discount no longer re-triggers an alert. `getSaleAlerts` resets
    `lastNotifiedPrice` to `null` once a wishlisted game's cut
    returns to 0, so a future sale at the same price still counts
    as fresh instead of being filtered forever by the strict `<`
    check.
  - Verified live end-to-end via ngrok: grouped card posted with
    correct mentions and formatting; re-running cron immediately
    produced zero new alerts (confirms the no-repeat-until-improved
    logic); Check price button opened a correct ephemeral embed
    without disturbing the original alert message.
  - Full test coverage across `shouldNotify.test.ts`,
    `repositories/wishlist.test.ts` (`updateLastNotifiedPrices`),
    `services/cron.test.ts` (grouping, reset branch), new
    `discord/views/saleAlert.test.ts` and
    `discord/components/saleAlert.test.ts`, plus updated
    `route.test.ts` for the cron endpoint. 285/285 passing
    project-wide, ~98.6% coverage.
- [x] "Add to wishlist" toggle button on `/price` embed replies —
      new `discord/interactions/buildWishlistToggleButton.ts` (single-
      button ActionRow, `Primary`/blurple style for "Add" as the main
      CTA, `Secondary` for "Remove"), wired into both `/price`'s
      single-match reply and `handlePriceSelect`'s disambiguation
      re-render. `custom_id: price_wishlist_toggle:{itadId}` re-checks
      membership at click time rather than trusting the button's own
      label.
  - New `isGameWishlistedByDiscordId()` repo helper — a single joined
    query (`wishlist_items` → `users` on `discord_id`) instead of a
    separate user lookup followed by a membership check, cutting one
    round trip per check. `services/wishlist.ts`'s `isGameWishlisted()`
    is a thin passthrough.
  - Cost pass before merging: `handlePriceWishlistToggle` reuses
    `interaction.message.embeds` from the existing message instead of
    re-fetching prices and rebuilding the embed after a toggle — the
    price data didn't change just because the wishlist did, so this
    cuts a `getGamePrices` call (and its `buildPriceEmbed` cost) out of
    every click entirely.
  - Button hidden in DMs (no `guild_id`) — wishlist add/remove needs a
    guild context (`getInteractionGuildId` throws otherwise), so
    showing a button that would error on click is worse than omitting
    it.
  - Full test coverage: `buildWishlistToggleButton.test.ts` (new),
    repo/service tests for `isGameWishlistedByDiscordId`/
    `isGameWishlisted`, updated `price.test.ts` and
    `components/price.test.ts` covering both toggle directions,
    limit-reached, and not-found branches. 297/297 passing
    project-wide.
  - Housekeeping alongside: removed two stale duplicate tests in
    `saleAlert.test.ts` left over from last session's header-copy
    change (asserted old wording that no longer matched
    `buildSaleAlertMessage`'s actual output).
  - **On a branch, not yet merged to `main`** — holding to watch real
    Neon usage before committing to it long-term. Repo now requires a
    PR to merge into `main` (previously self-bypass was allowed).
  - **Deliberately deferred**: swap the ➕/➖ Unicode icons for
    Discord's native button `emoji` field or app-owned custom emoji —
    bundle this with the existing pagination-glyph polish item below
    rather than doing icon work piecemeal.
  - **Deliberately deferred**: per-user component interaction rate
    limiting — same open risk already noted for `price_select`/
    `wishlist_add_select`; this button doesn't introduce a new class
    of exposure, just a slightly lower-friction path to the same
    existing DB cost. Worth a real look if abuse is ever observed.

## Later / backlog

- [x] Message-component buttons for disambiguation replies (instead of listing
      ITAD IDs as visible text) — button `custom_id` holds the UUID (well
      under Discord's 100-char limit), click re-runs price lookup via
      `MESSAGE_COMPONENT` interaction type on the same route. Kills the
      ugly-UUID-in-chat problem and the "retype the command" friction in
      one move. Natural to build alongside the existing "Add to wishlist"
      button item once `/wishlist add` exists.
- [x] Free games alerts via GamerPower API — second daily Vercel Cron
      job alongside price-check (Hobby tier supports up to 100 cron
      jobs/project now, confirmed against current docs), offset an
      hour to avoid a simultaneous Neon cold-start.
  - New `gamerpower/client.ts` — unauthenticated, no API key, scoped
    to `type=game&platform=pc`. Explicit `status === 'Active'` filter
    kept despite `/giveaways` being documented as active-only — a
    single-giveaway lookup was confirmed live to return an expired
    entry, so the endpoint's own description wasn't fully trusted.
  - `services/freeGames.ts`'s `getSortedFreeGames()` sorts by
    `published_date` descending — newest giveaways surface first
    rather than getting buried by older still-running ones.
  - Every guild with a configured `notificationChannelId` gets the
    alert (new `repositories/guilds.ts`'s
    `getGuildsWithNotificationChannel()`) — free games aren't
    wishlist-scoped like sale alerts, so there's no per-user targeting
    or `@mention`ing here, just a guild-wide post. One shared channel
    for both sale alerts and free games in v1 (no separate
    `/config` subcommand yet — deferred, see backlog).
  - `discord/views/freeGames.ts`'s `buildFreeGamesMessage()` has two
    render modes sharing one function: **lean** (plain `TextDisplay`
    entries, no images — used for the cron-posted public message so
    an automatic channel post stays compact for people who didn't ask
    to see it) and **rich** (`Section` + `Thumbnail` accessory per
    entry — reserved for the ephemeral `/free` command, where the
    visual cost is only paid by whoever chose to look). Component
    budget forced the split: rich mode costs 3 components/entry
    versus lean's 1, so `MAX_GAMES_PER_MESSAGE` (8, lean) and
    `MAX_GAMES_PER_MESSAGE_RICH` (5, rich) differ to stay under
    Discord's 40-component ceiling with a nav row present.
  - Pagination reuses the existing `buildPaginationRow`/`clampPage`/
    `getTotalPages` primitives from the wishlist work rather than
    duplicating them. Two separate component handlers
    (`free_games_page`, `free_games_page_rich`), keyed by distinct
    `custom_id` prefixes so a click always knows which render mode to
    stay in without smuggling a flag through the payload. Both
    live-refetch from GamerPower on every click rather than caching
    the cron's snapshot — messages can sit in a channel for days, and
    a stale "free" link pointing at an expired giveaway felt worse
    than the extra fetch (GamerPower's 10 req/sec limit has plenty of
    headroom; no DB involved in this path at all).
  - `/free` command — ephemeral, rich mode, lets a user check current
    giveaways on demand instead of waiting for the daily post.
  - Title-links each entry to its own `open_giveaway_url` (a
    `gamerpower.com` URL) — satisfies GamerPower's attribution ask
    (an active hyperlink back to their site) automatically, no
    separate "provided by" line needed. A `stripGiveawaySuffix()`
    helper trims the redundant trailing `" Giveaway"` GamerPower bakes
    into every title, kept local to the view (only one consumer).
  - **Real bug caught and fixed before merging**: rich mode's
    `Section` + `Thumbnail` accessory tripled the per-entry component
    cost versus the original all-`TextDisplay` draft, which silently
    pushed a 9-per-page cron message over Discord's 40-component cap
    (`COMPONENT_MAX_TOTAL_COMPONENTS_EXCEEDED`, confirmed live) the
    moment thumbnails were added — caught via a failed `postChannelMessage`
    call once error logging was added to the cron route's
    `Promise.allSettled` results (previously only counted failures,
    didn't log the reason). Resolved by splitting lean/rich modes with
    different page-size constants rather than a single shared cap.
  - Live-tested end-to-end via ngrok: cron post renders correctly
    (lean, 8/page, paginated), `/free` renders correctly (rich,
    5/page, thumbnails, ephemeral "Only you can see this"), Prev/Next
    updates the shared cron message for all viewers as expected
    (confirmed this is standard Discord behavior for any public
    message with buttons, not a bug — `/free`'s ephemeral response is
    the private alternative for anyone who wants per-user control).
  - Full test coverage across `gamerpower/client.test.ts`,
    `services/freeGames.test.ts`, `discord/views/freeGames.test.ts`
    (lean/rich rendering, pagination, title-stripping, thumbnail
    accessory), `discord/components/freeGames.test.ts` (both handlers),
    `app/api/cron/free-games/route.test.ts`. 330/330 passing
    project-wide, ~98.5% coverage.
  - **Deliberately deferred**: guild-level opt-out toggle for free
    games alerts (needs a migration + `/config` subcommand — same
    posture as the alert-visibility toggle already in backlog);
    claim-count (`users` field) shown as supplementary per-entry text
    rather than a sort key — new giveaways start at ~0 clicks
    regardless of how big the title is, so sorting by it would
    undercut the newest-first ordering that's the whole point of a
    daily feed.
  - **Considered and rejected**: baking GamerPower into the wishlist
    sale-alert pipeline (a "this wishlisted game just went free!"
    alert). ITAD already surfaces 100%-off promotions on major
    storefronts as ordinary deals (confirmed live — a wishlisted
    game's Ubisoft Store 100%-off promotion showed up as a normal
    sale alert with zero special-casing needed), so the big-store
    overlap between the two sources is already covered by existing
    alerts. GamerPower's actual unique value is the long tail ITAD
    doesn't track (itch.io, IndieGala, reward-point unlocks) — but
    those have no shared canonical ID with `games.itad_id`, only a
    free-text title, so any crossover matching would mean fuzzy
    title-matching with real risk of false positives. Marked
    long-term/maybe-never rather than near backlog specifically
    because of the missing-ID problem.
- [x] `/wishlist list` sorted by discount, highest first — free games
      (100% cut) surface at the top automatically, since 100 is just
      the highest number in the same descending sort; no special-
      casing needed. Items with no live price data sink below even a
      0%-cut game. Small addition alongside the free-games work,
      `wishlistList.test.ts` updated to assert sort order rather than
      input-order preservation.
- [x] Sale alert card accent color changed from green to purple —
      cosmetic, decouples the alert card's color from `/price`'s own
      on-sale-green styling.
- [x] Surface `/wishlist remove`'s select menu directly on the
      limit-reached reply — lets a user free a slot without a second
      command round-trip. Wired into all three places `limit_reached`
      can fire: `/wishlist add` (command), its disambiguation-button
      counterpart (`handleWishlistAddSelect`), and `/price`'s
      "➕ Add to wishlist" toggle button (`handlePriceWishlistToggle`).
  - `buildWishlistRemoveMessage()` gained an optional third `content`
    param so the limit-reached message ("Your wishlist is at the
    N-game limit — pick something to remove:") can override the
    default "Select a game to remove:" line without a second render
    path. New `wishlistLimitReachedWithRemoveMessage()` in
    `lib/constants.ts` replaces the old plain
    `wishlistLimitReachedMessage()`, which is now dead and removed.
  - No new `custom_id` or component handler — selecting an option
    still routes through the existing `wishlist_remove_select`
    handler, which has no idea (and doesn't need to know) it was
    opened from a limit-reached reply rather than `/wishlist remove`
    directly. This is what keeps the "not auto-adding the pending
    game after a removal" property automatic rather than something
    that needed separate handling.
  - `/price`'s toggle button changes response shape here: instead of
    `UpdateMessage` on the original (often-public) `/price` embed, the
    limit-reached case now replies with a **new, ephemeral** message
    carrying the picker (`ChannelMessageWithSource`). Deliberate —
    the old `UpdateMessage` path would have rewritten a public embed
    to show one user's private wishlist contents to the whole
    channel. The public embed and its button are now left untouched
    on a limit-reached click; only the clicking user sees the picker.
  - Full test coverage: `wishlistRemove.test.ts` (content override),
    updated limit-reached assertions in `commands/wishlist.test.ts`,
    `components/wishlist.test.ts`, and `components/price.test.ts`
    (the last one rewritten for the new response type/flags rather
    than extended). 331/331 passing project-wide, ~98.5% coverage.
- [x] Bundles integration, phase 1 — "Show bundles" button on `/price`
      embed replies. New `itad/client.ts`'s `getBundlesForGame()`
      (`GET /games/bundles/v2`), filtered client-side by `expiry`
      since this endpoint isn't guaranteed active-only (confirmed
      during recon: returned bundles as old as 2018 alongside live
      ones). New `discord/views/bundles.ts` (`buildBundlesMessage`)
      — plain embed, amber accent (`0xe67e22`, distinct from
      `/price`'s blue/green and sale alerts' purple), capped at 5
      bundles shown with a "+N more" footer note; shows each bundle's
      shop, game count, and starting tier price (tiers are
      cumulative, so the first tier is always the cheapest entry
      point). New `discord/components/bundles.ts`
      (`handleShowBundles`) mirrors `handleSaleAlertCheckPrice`'s
      always-fresh-ephemeral posture — never `UpdateMessage`, since
      the underlying `/price` embed is often public.
  - Button (`buildBundlesButton.ts`, 📦 icon, `Primary`/blurple)
    shown **unconditionally** on every `/price` reply, including
    DMs — no way to know in advance whether a game has an active
    bundle without a second lookup, which would defeat the point of
    an on-demand button. An empty "no active bundles" reply is a
    normal, low-stakes outcome, same posture as `/free`'s "no
    options match your search" empty state.
  - Merged into the same `ActionRow` as the wishlist toggle button
    rather than a second row (Discord allows 5 buttons/row, plenty
    of headroom) — `buildWishlistToggleButton`/`buildBundlesButton`
    stay independent single-responsibility builders, callers spread
    both `.components` arrays into one row when both apply.
  - Wishlist toggle button recolored `Success`(green)/`Secondary`
    (gray) instead of `Primary`, freeing up blurple for the bundles
    button so the row reads as three distinct, purposeful colors
    rather than two buttons competing for the same blurple.
  - 📦 chosen over 🎁 specifically to avoid clashing with
    `freeGames.ts`'s existing 🎁 header icon — two different
    messages using the same emoji for different meanings would be
    confusing.
  - **Real bug caught and fixed before merging**: the wishlist-toggle
    handler's `UpdateMessage` branch rebuilt its component row with
    only the toggle button, silently dropping the bundles button on
    every Add/Remove click (confirmed live via screenshot — button
    vanished on toggle). Fixed with the same row-merge pattern used
    in the initial render path. Test coverage gap that let this
    through: existing toggle tests only asserted on
    `components?.[0]` (the single button) rather than checking the
    row contained both buttons — added `toHaveLength(2)` +
    second-button assertions to both toggle-direction tests to
    close the gap.
  - Full test coverage: `buildBundlesButton.test.ts`,
    `views/bundles.test.ts` (empty state, plural phrasing, tier
    price formatting, free-tier fallback, 5-bundle cap + footer),
    `components/bundles.test.ts` (found/not-found branches),
    `itad/client.test.ts` (URL/param construction, expiry filtering,
    error paths), updated `commands/price.test.ts` and
    `components/price.test.ts` for the new button/merged-row shape.
    348/348 passing project-wide, 98.56% coverage.
  - **Deliberately deferred to phase 2**: caching `bundledCount` (and
    a refresh timestamp) on the `games` table, populated by the
    `overview/v2` cron swap below rather than by the on-demand
    button click — a click-triggered cache write was considered and
    rejected: the click that would trigger it already shows the live
    list directly, so the only benefit is a future `/price` lookup
    on the same game, which doesn't justify a second writer touching
    the same DB column as the cron path. No TTL/auto-deletion
    needed either way — tomorrow's cron run naturally corrects a
    stale count back to 0 once a bundle expires, same self-healing
    pattern `historyLow` already relies on.
  - **Still open**: `POST /games/overview/v2` cron-swap (bundle count
    for free, same batch call, no new rate-limit cost) and the
    `bundledCount` caching above; standalone `/bundles` command
    riding `GET /bundles/v1` (confirmed reliably non-empty, unlike
    per-game lookups — 7-10 active bundles seen live across several
    test calls). Neither started yet.
- [x] `/help` command — Components V2, ephemeral. Lists all commands
      (`/price`, `/wishlist`, `/free`, `/config alerts-channel`) grouped
      in blockquote blocks for visual separation (matches the pattern
      other Discord help bots use). No ITAD/GamerPower credits line here
      — moved to the privacy-policy page instead, since attribution
      belongs somewhere someone would actually go looking for it, not a
      quick command reference.
  - `discord/views/help.ts` (`buildHelpMessage`), `discord/commands/help.ts`
- [x] `/price` embed cleanup pass — compact numbers for review counts and
      player counts (`Intl.NumberFormat`'s `notation: 'compact'`, no new
      dependency); "+N more shop(s)" reworded to "+N more stores" and
      relocated from the footer into the last shown deal's own field
      (appended as a `-#` subtext line) rather than a separate field —
      avoids the phantom-row problem a zero-width-space field name causes.
      Footer dropped entirely as a side effect: Discord always renders
      fields → image → footer regardless of build order, so removing the
      footer is what actually makes the banner image the last thing on
      the card.
  - Also dropped the game ID from the visible embed — no longer needed
    now that disambiguation is button-driven (the button's own
    `custom_id` already carries it); kept it out rather than giving the
    footer a reason to exist again.
- [x] `/forget-me` command — per-user data deletion. Deletes the `users`
      row for the invoking Discord ID; `wishlist_items.userId`'s existing
      `onDelete: 'cascade'` FK handles the rest, no separate cleanup step
      needed. `games`/`prices` rows are untouched — shared catalog data,
      not personal data, so nothing of the user's remains in them once
      their row is gone.
  - Works in DMs too — first command with no guild-context dependency at
    all (doesn't touch `getInteractionGuildId`).
  - Two-step confirmation via buttons rather than a typed "CONFIRM"
    string: `/forget-me` with no existing row replies with a plain
    "nothing to delete" message; with a row, replies with a warning and
    a Danger/Secondary button pair (`forget_me_confirm`/
    `forget_me_cancel`). `custom_id`s are static — no suffix needed,
    since the message is ephemeral and only the invoker can ever see or
    click it. The confirm handler still re-derives the Discord ID from
    the interaction itself rather than trusting anything encoded in
    `custom_id`, same posture as every other handler in this codebase.
  - Handles the double-click race explicitly: if `deleteUserByDiscordId`
    finds no row (already deleted by an earlier click), the confirm
    handler reports the honest "nothing to delete" message instead of a
    false "deleted" success.
  - Verified live via ngrok: no-data case, confirm case (row confirmed
    gone via a follow-up lookup logged in dev output), ran from a
    second test account to keep a full wishlist around for other
    testing.
  - Full test coverage: `repositories/users.test.ts`
    (`deleteUserByDiscordId` — delete-existing, delete-nonexistent,
    cascade-to-wishlist_items), `commands/forgetMe.test.ts`,
    `components/forgetMe.test.ts` (confirm/cancel, double-click race).
    364/364 passing project-wide, 98.28% coverage.
  - **Not done yet**: per-guild data wipe (delete the `guilds` config
    row only, leaving personal wishlists untouched — already scoped
    last session) and the privacy-policy page itself, which was
    deliberately waiting on this command existing first.
- [x] `/config remove-alerts` — per-guild alert config removal. Deletes
      the `guilds` row for the invoking guild; `notificationChannelId`
      goes with it, stopping sale and free-game alerts. `users`/
      `wishlist_items` are untouched — `users.guildId` has no FK to
      `guilds`, so there's no cascade risk, and a user's next
      guild-scoped command elsewhere just overwrites `guildId` naturally
      (confirmed, no code needed for that recovery path).
  - Admin-gated via the same `default_member_permissions: '32'` already
    set on the parent `/config` command — no extra permission wiring
    needed for the new sibling subcommand. Confirmed live: `/config`
    doesn't even appear as an option for a non-admin test account.
  - Same two-button confirm/cancel pattern as `/forget-me`
    (`config_remove_alerts_confirm`/`config_remove_alerts_cancel`,
    static custom_ids, re-derives `guildId` from the interaction rather
    than trusting anything encoded client-side). Warning copy avoids
    saying "can't be undone" — a config reset genuinely can be undone by
    re-running `/config alerts-channel`, unlike `/forget-me`'s actual
    data deletion, so the wording says exactly that instead.
  - Same double-click race handling as `/forget-me`: confirm reports an
    honest "nothing to remove" instead of a false success if the row's
    already gone by the second click.
  - `/help` updated to cover both `/config` subcommands in one line, and
    gained a missing `/forget-me` entry that had been left out when that
    command shipped last session.
  - Verified live via ngrok: no-config case, cancel case, confirm case
    (row confirmed gone via dev server query logs and a follow-up
    re-run), non-admin permission gating.
  - Full test coverage: `repositories/guilds.test.ts`
    (`getGuildByGuildId`/`deleteGuildByGuildId` — delete-existing,
    delete-nonexistent, cross-guild isolation), `commands/config.test.ts`
    (remove-alerts branches), `components/config.test.ts` (confirm,
    double-click race, cancel), `views/help.test.ts` updated for the
    fifth command entry. 374/374 passing project-wide, 98.32% coverage.
- [x] `/privacy-policy` command + `/privacy` web page — completes the
      privacy-policy work `/forget-me` and `/config remove-alerts` were
      deliberately blocking on. Two-part split: `src/app/privacy/page.tsx`
      is the canonical, full-detail policy (static Next.js route, no
      client JS); `/privacy-policy` is a Components V2 Discord command
      (`discord/views/privacyPolicy.ts`) that gives a short in-Discord
      summary plus a Link-style button out to the full page — link
      buttons need no component handler at all, Discord opens the URL
      directly.
  - Data breakdown accurate to the schema, not generic boilerplate:
    Discord ID, last-touched guild, wishlist entries + last-alerted
    price, daily price-history log (retention window intentionally
    left as "limited period, not forever, TBD" rather than committing
    to a number not yet decided), shared game-catalog data, and
    per-guild alert config.
  - ITAD/GamerPower attribution lives on `/privacy` under "Third
    parties," per each API's ToS (ITAD: "Data from X," never
    "Powered by X"; GamerPower: active hyperlink). No "support these
    sources" language added — that register felt out of place in a
    data/legal document; parked as a candidate for a future `/about`
    command instead.
  - `globals.css` dark-mode background swapped from flat `#0a0a0a` to
    `oklch(21% 0.006 285.885)` (zinc-950) — matches the zinc-700/300
    text tones already used on `/privacy` rather than mixing a
    generic near-black with Tailwind's oklch-based palette.
  - `/help` updated with the new command per the standing invariant.
  - Full test coverage: `commands/privacyPolicy.test.ts` (response
    shape/flags), `views/privacyPolicy.test.ts` (content, Link button
    target), `views/help.test.ts` updated for the sixth entry.
    379/379 passing project-wide, 98.35% coverage.
  - **Not done yet**: `/about` command (bot identity, GitHub link,
    future home for a "support the dev" / ITAD-GamerPower shoutout
    line) — deliberately scoped out of this session.
- [x] `/feedback` command — modal-based bug reports and suggestions.
      Opens a Label-wrapped modal directly from `/feedback` (no
      intermediate button step) with a category `StringSelect`
      (bug/suggestion/other), a required `TextInput` (Paragraph,
      capped at 1000 chars to stay comfortably under the embed
      description limit), and an optional `FileUpload` for a
      screenshot — Discord's newer modal component model (Label
      wrapping Select/TextInput/FileUpload) rather than the legacy
      ActionRow+TextInput-only modals.
  - New `discord/modals/` registry (mirrors `discord/commands/`/
    `discord/components/`/`discord/autocomplete/`, keyed by
    `custom_id` prefix), dispatched from a new
    `InteractionType.ModalSubmit` branch in `route.ts`.
  - Submissions post as a classic `APIEmbed` (not Components V2 —
    matches `discord/embeds/`'s existing scope: a one-shot admin log
    entry, no pagination/interactivity) to a new private
    `FEEDBACK_CHANNEL_ID` channel, footer carries the submitter's
    Discord ID and guild/DM origin, description carries a clickable
    `<@id>` mention (embed footers don't render markdown, embed
    descriptions do).
  - **Real bug caught and fixed live**: fetching the screenshot off
    Discord's ephemeral CDN plus re-uploading it as a real multipart
    attachment (`postChannelMessageWithFile`, new sibling to
    `postChannelMessage`) risks exceeding Discord's 3-second
    interaction ACK window, confirmed live via a "Something went
    wrong" client-side error despite the message still landing
    server-side. Fixed with `InteractionResponseType.DeferredChannelMessageWithSource`
    - Next's `after()` for the screenshot path only — text-only
      submissions stay synchronous since they comfortably fit the
      window. New `editOriginalInteractionResponse()` (PATCH
      `/webhooks/{app_id}/{token}/messages/@original`) finalizes the
      deferred reply once the upload completes.
  - Screenshot re-upload deliberately doesn't trust Discord's signed
    ephemeral CDN URL long-term (`ex`/`is`/`hm` expiry params) —
    fetches the bytes server-side and re-uploads as a permanent
    attachment on the feedback-channel message instead.
  - `/privacy` updated to note `/feedback` submissions aren't covered
    by `/forget-me` (not DB-stored — live as a channel message only).
  - Full test coverage: `buildFeedbackModal.test.ts`,
    `commands/feedback.test.ts`, `modals/feedback.test.ts` (all
    validation/no-screenshot/screenshot branches, including the
    deferred-error path), `rest.test.ts` additions for
    `postChannelMessageWithFile`/`editOriginalInteractionResponse`,
    `route.test.ts` additions for `ModalSubmit` dispatch. 402/402
    passing project-wide, ~98.4% coverage.
  - **Not done yet**: `file_types` restriction on the screenshot
    `FileUpload` (shipped in Discord's API Aug 5, 2026 — worth
    confirming `discord-api-types` has caught up before relying on
    it) to scope uploads to actual images.
- [ ] Consider migrating `/price` to Components V2 — the inline 3-across
      Released/Reviews/Players field grid is the one thing keeping it on
      classic embeds today (V2 has no equivalent to Discord's automatic
      inline-field layout). V2 would unlock real spacing control
      (`Separator` has small/large size options — classic embeds have no
      margin/spacing property between fields at all), which came up
      wanting more breathing room between the store list, Historical low,
      and the metadata row. Undecided whether losing the 3-across grid is
      worth it for one row's layout — needs its own look once there's
      time, not urgent. Bundle with the existing "Historical low field
      layout" item above if/when this happens, since both touch the same
      area of the embed.
- [ ] User-defined notification thresholds (min % off, price ceiling, historical-low-only, store filter)
- [ ] Web dashboard (tracked games + price history, reusing the same service layer as the bot)
- [ ] Context-menu commands (type 2 "User" / type 3 "Message") — e.g. right-click a message → check price history
- [ ] Global command registration (once ready to invite the bot to other servers)
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
- [ ] Auto-posted pinned welcome interface in the alerts channel —
      on a successful `/config alerts-channel`, post a real (non-
      ephemeral) Components V2 card into that channel via the
      existing `postChannelMessage()`, that the admin can pin
      themselves (no extra bot permission needed — whoever ran the
      command already has pin rights in that channel). Card: 3
      Sections (text + button accessory each) for zero-input actions
      that reuse existing view builders directly — "My wishlist"
      (`buildWishlistListMessage`), "Free games" (`buildFreeGamesMessage`)
      — plus a "Check price" button that opens a modal (one TextInput,
      no autocomplete possible from a button click) feeding into the
      existing `resolveGame()` pipeline. Tone: warm/plain, game-first,
      no `/forget-me` button (wrong first impression on a welcome
      card — already reachable via `/privacy-policy`), `/help`
      referenced as a text pointer rather than a 4th button. Optional
      bot auto-pin is now cheap permission-wise (`PIN_MESSAGES` split
      from `MANAGE_MESSAGES` as of Feb 23, 2026 — narrow, single-
      purpose grant) but not required for the flow to work.
- [ ] Context-menu commands, refined scope — Message command
      ("check price") is the stronger fit over User commands: right-
      click any message → modal opens with a TextInput pre-filled via
      the message's own content (`.setValue(message.content)`), user
      edits down to just the game title, submits into the existing
      `resolveGame()` pipeline. No MESSAGE_CONTENT intent needed —
      context-menu targets are handed over in full specifically
      because the user explicitly selected that message. Right-
      clicking the bot itself (User command, bot as target) is also
      viable and would show the same 3-button interface card as the
      pinned-message idea above — needs a quick empirical check
      (register guild-scoped, right-click the bot, confirm the Apps
      submenu appears same as for a regular member) before committing
      to it. No autocomplete possible either way — context commands
      take zero options, modal text inputs are fully client-side
      until submit.
- [ ] Modal-based settings UI, reminder only (not scoped) — Discord
      shipped Radio Group/Checkbox Group/Checkbox components for
      modals in Feb 2026, on top of the Select/TextInput/FileUpload
      already used by `/feedback`. Strongest fit: "User-defined
      notification thresholds" above — TextInput for min%/price
      ceiling, Checkbox for historical-low-only, CheckboxGroup for
      store filter, one form instead of several command options.
      Also considered for per-guild alert-type toggles (sale/free-
      game/GamerPower on-off) if `/config` grows a second or third
      toggle — not worth it for just one. Deliberately NOT used for
      pure confirm/cancel flows (`/forget-me`, `/config remove-alerts`)
      — a modal adds friction for a decision needing zero text input;
      buttons stay correct there.

## Possible future upgrades (not needed yet — revisit only if usage justifies it)

- [ ] Game subscription availability (`POST /games/subs/v1`) —
      confirmed live (Sea of Thieves → Game Pass), clean
      `{id, subs: [{id, name, leaving}]}` shape, same batched-by-`gid`
      pattern as the other endpoints. Candidate: a subscription line
      on `/price`'s embed ("🎮 Available on Game Pass") when `subs` is
      non-empty. `leaving` field untested against a game actually
      scheduled to leave a service — worth confirming before building
      any "leaving soon" callout on top of it.
- [ ] Per-store historical low (`POST /games/storelow/v2`) —
      confirmed live, per-shop lows with timestamps vs. the single
      cross-store number `/price` shows today. Candidate: sharpen the
      "Historical low" field to name the shop and date
      ("$5.09 · GOG, Nov 2020"). Low priority — natural to bundle with
      the existing "Historical low field layout" item below rather
      than doing icon/layout work twice.
- [ ] Display price history (data's already being logged from MVP)
- [ ] Local trigram-indexed game catalog mirror for autocomplete — if
      ITAD's shared app-wide rate limit (1000 req/5min, shared with
      /price, /wishlist add, and the daily cron) ever becomes a real
      constraint at scale, mirror ITAD's own game catalog into a
      games-adjacent Neon Postgres table using the `pg_trgm` extension
      (trigram fuzzy matching + GIN index) for local search instead of
      hitting ITAD on every autocomplete keystroke. ITAD's changelog
      mentions unstable `games list`/`games changes` endpoints meant
      for exactly this — bulk-seed once, sync incrementally. Real work
      (sync job, staleness handling, a new schema decision), so only
      worth it once the ITAD usage graph actually says so, not before.
- [ ] Docker + VPS migration (only if free-tier serverless is ever
      genuinely outgrown)

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
- Stack locked in: Next.js (App Router) + TS, Discord HTTP Interactions, Drizzle + Neon Postgres, Vercel Cron (daily), IsThereAnyDeal API, GamerPower API, Vercel deploy, GitHub Actions for CI, Docker deferred until post-MVP, no Redis (SQL dedup via a `last_notified_price` column is enough).
- Testing: Vitest (`environment: 'node'`, no jsdom needed — no frontend yet), tests co-located as `*.test.ts` next to source. `vitest.config.ts` uses `projects` to isolate `repositories/**` tests with `fileParallelism: false` (they share one real Postgres instance via Docker + neon-proxy; unit tests elsewhere mock everything and stay parallel). MSW for mocking ITAD HTTP calls, not yet used.
