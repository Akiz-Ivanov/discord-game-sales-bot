import { describe, it, expect } from 'vitest'
import { getFocusedQuery } from './getFocusedOption'
import type { APIApplicationCommandAutocompleteInteraction } from 'discord-api-types/v10'

const buildInteraction = (options: unknown[]) =>
  ({
    data: { options },
  }) as unknown as APIApplicationCommandAutocompleteInteraction

describe('getFocusedQuery', () => {
  it('returns the focused option value for a flat command', () => {
    const interaction = buildInteraction([
      { name: 'game', value: 'hollow kni', focused: true },
    ])
    expect(getFocusedQuery(interaction)).toBe('hollow kni')
  })

  it('finds the focused option nested under a subcommand', () => {
    const interaction = buildInteraction([
      {
        name: 'add',
        options: [{ name: 'game', value: 'celeste', focused: true }],
      },
    ])
    expect(getFocusedQuery(interaction)).toBe('celeste')
  })

  it('ignores non-focused options', () => {
    const interaction = buildInteraction([
      { name: 'other', value: 'ignore me' },
      { name: 'game', value: 'hollow', focused: true },
    ])
    expect(getFocusedQuery(interaction)).toBe('hollow')
  })

  it('returns an empty string when nothing is focused', () => {
    expect(
      getFocusedQuery(buildInteraction([{ name: 'game', value: 'x' }]))
    ).toBe('')
  })

  it('trims whitespace from the focused value', () => {
    const interaction = buildInteraction([
      { name: 'game', value: '  celeste  ', focused: true },
    ])
    expect(getFocusedQuery(interaction)).toBe('celeste')
  })

  it('returns an empty string when a subcommand has nested options but none are focused', () => {
    const interaction = buildInteraction([
      { name: 'add', options: [{ name: 'game', value: 'x' }] },
    ])
    expect(getFocusedQuery(interaction)).toBe('')
  })

  it('does not treat a focused option with an undefined value as a match', () => {
    const interaction = buildInteraction([{ name: 'add', focused: true }])
    expect(getFocusedQuery(interaction)).toBe('')
  })
})
