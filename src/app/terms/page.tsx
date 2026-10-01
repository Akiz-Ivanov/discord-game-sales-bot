import type { Metadata } from 'next'
import { BOT_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Terms of Service — ${BOT_NAME}`,
  description: `The terms for using ${BOT_NAME}.`,
}

const SECTIONS = [
  {
    heading: 'What this is',
    body: (
      <p>
        {BOT_NAME} is a free Discord bot that looks up PC game prices, tracks a
        personal wishlist, and posts sale and free-game alerts. It&apos;s an
        independent solo project, not affiliated with Discord,
        IsThereAnyDeal, or GamerPower. By adding the bot to a server or using
        its commands, you agree to these terms.
      </p>
    ),
  },
  {
    heading: 'Free, and provided as-is',
    body: (
      <>
        <p>
          The bot is free to use and is run as a hobby project on free
          hosting and database tiers. That means it&apos;s provided
          &quot;as is&quot;, with no guarantee that it will always be
          available or correct. It may be slow, go down, or hit rate limits
          from the services it depends on, sometimes without warning.
        </p>
        <p className="mt-3">
          The bot is free today. If that ever changes, this page will be
          updated before it does.
        </p>
      </>
    ),
  },
  {
    heading: 'Prices and game data',
    body: (
      <ul className="list-disc space-y-3 pl-5">
        <li>
          Prices, discounts, bundles, and free-game listings come from third
          parties and can be out of date or wrong by the time you read them.
          Deals can also end at any moment.
        </li>
        <li>
          Always check the price on the store&apos;s own page before you
          buy. The bot isn&apos;t responsible for purchases made based on
          what it showed you.
        </li>
        <li>
          Store links open pages run by other companies. This bot has no
          control over those sites, their prices, or their policies.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Using the bot responsibly',
    body: (
      <ul className="list-disc space-y-3 pl-5">
        <li>
          Follow Discord&apos;s own Terms of Service and Community
          Guidelines when you use the bot.
        </li>
        <li>
          Don&apos;t try to overload, scrape, or break the bot, for example
          with scripted or automated commands. Wishlists are capped per user
          to prevent this.
        </li>
        <li>
          Don&apos;t use the bot to harass anyone or to spam channels.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Your data',
    body: (
      <p>
        What the bot stores, and how to delete it, is explained on the{' '}
        <a href="/privacy" className="underline">
          Privacy Policy
        </a>{' '}
        page. Using the bot also means agreeing to what&apos;s described
        there.
      </p>
    ),
  },
  {
    heading: 'Changes and access',
    body: (
      <ul className="list-disc space-y-3 pl-5">
        <li>
          Features may change, move, or be removed, and the bot may be
          paused or shut down at any time.
        </li>
        <li>
          Access to the bot may be limited or blocked for a user or a server
          that abuses it.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Limitation of liability',
    body: (
      <p>
        To the extent allowed by law, the bot&apos;s owner isn&apos;t liable
        for any loss or damage that comes from using the bot, including money
        spent on a purchase, a missed deal, or downtime. You use it at your
        own risk.
      </p>
    ),
  },
  {
    heading: 'Changes to these terms',
    body: (
      <p>
        These terms may change as the bot changes. Check back here for the
        current version. Continuing to use the bot after a change means you
        accept the updated terms.
      </p>
    ),
  },
  {
    heading: 'Questions',
    body: (
      <p>
        Use <code>/feedback</code> in Discord, or open an issue on{' '}
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

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: October 2026
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