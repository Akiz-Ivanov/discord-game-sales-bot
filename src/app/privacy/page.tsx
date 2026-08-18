import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Game Sales Bot',
  description: 'What data Game Sales Bot stores, why, and how to remove it.',
}

const SECTIONS = [
  {
    heading: 'What this is',
    body: (
      <p>
        Game Sales Bot is a Discord bot that tracks game prices and lets you
        build a personal wishlist for price-drop and free-game alerts. It&apos;s
        an independent solo project, not affiliated with Discord,
        IsThereAnyDeal, or GamerPower.
      </p>
    ),
  },
  {
    heading: 'Data we store, and why',
    body: (
      <ul className="list-disc space-y-3 pl-5">
        <li>
          <strong>Your Discord ID</strong> — so we can associate your wishlist
          with you across sessions.
        </li>
        <li>
          <strong>The server you last used a wishlist command in</strong> — so
          wishlist-related messages route correctly. This gets overwritten
          automatically the next time you use a wishlist command in a different
          server; it&apos;s not a fixed link to one server.
        </li>
        <li>
          <strong>Your wishlist entries</strong> — which games you&apos;ve
          added, and the price you were last alerted at (so we don&apos;t notify
          you again for the same deal).
        </li>
        <li>
          <strong>Price history</strong> — we check prices once a day for every
          tracked game and log the result, which is how &quot;historical
          low&quot; prices are shown. This log is kept for a limited period, the
          exact retention window is still being finalized, and this page will be
          updated once it&apos;s locked in.
        </li>
        <li>
          <strong>Game catalog data</strong> — titles, store IDs, and cached low
          prices for games people have looked up. This isn&apos;t tied to any
          individual user; it&apos;s shared reference data, the same for
          everyone.
        </li>
        <li>
          <strong>Server alert settings</strong> — which channel a server&apos;s
          admin has chosen for sale and free-game alerts. Set by an admin, not
          personal to any one user.
        </li>
        <li>
          <strong>Feedback submissions</strong> — if you use{' '}
          <code>/feedback</code>, your message, category, Discord ID, and server
          context (plus an optional screenshot) are posted to a private channel
          only the bot owner can see. This isn&apos;t stored in the bot&apos;s
          database and isn&apos;t deleted by <code>/forget-me</code> — it
          remains as a message in that channel until manually removed.
        </li>
      </ul>
    ),
  },
  {
    heading: "What we don't collect",
    body: (
      <p>
        We don&apos;t read or store the content of your messages. We don&apos;t
        collect email addresses, payment information, or anything beyond
        what&apos;s needed for the features above.
      </p>
    ),
  },
  {
    heading: 'How to remove your data',
    body: (
      <ul className="list-disc space-y-3 pl-5">
        <li>
          <strong>
            <code>/forget-me</code>
          </strong>{' '}
          — deletes your wishlist and any personal data stored about you. This
          can&apos;t be undone.
        </li>
        <li>
          <strong>
            <code>/config remove-alerts</code>
          </strong>{' '}
          (server admins only) — removes a server&apos;s alert configuration and
          stops sale and free-game alerts there. Doesn&apos;t touch any
          user&apos;s personal wishlist.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Third parties',
    body: (
      <ul className="list-disc space-y-3 pl-5">
        <li>
          Price data comes from{' '}
          <a href="https://isthereanydeal.com" className="underline">
            IsThereAnyDeal
          </a>
          . We are not affiliated with or endorsed by them.
        </li>
        <li>
          Free-game listings come from{' '}
          <a href="https://www.gamerpower.com" className="underline">
            GamerPower
          </a>
          .
        </li>
        <li>
          Store names and logos shown in price listings belong to their
          respective owners; this bot is not affiliated with or endorsed by any
          of them.
        </li>
        <li>
          Infrastructure: hosted on Vercel, database on Neon (Frankfurt, EU),
          delivered via Discord.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Changes to this policy',
    body: (
      <p>
        This policy may change as the bot changes. Check back here for the
        current version.
      </p>
    ),
  },
  {
    heading: 'Questions',
    body: (
      <p>
        Open an issue on{' '}
        <a
          href="https://github.com/Akiz-Ivanov/discord-game-sales-bot"
          className="underline"
        >
          GitHub
        </a>
        .
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: August 2026
        </p>
      </div>
      {SECTIONS.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-2 text-lg font-medium">{section.heading}</h2>
          <div className="text-zinc-700 dark:text-zinc-300">{section.body}</div>
        </section>
      ))}
    </main>
  )
}
