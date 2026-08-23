import { describe, it, expect, vi } from 'vitest'

vi.mock('@/discord/commandIds', () => ({
  COMMAND_IDS: { price: '111', wishlist: '222' },
}))

import { mention } from './commandMention'

describe('mention', () => {
  it('renders a top-level command mention', () => {
    expect(mention('price')).toBe('</price:111>')
  })

  it('renders a subcommand mention with a space before the colon-id', () => {
    expect(mention('wishlist', 'add')).toBe('</wishlist add:222>')
  })
})
