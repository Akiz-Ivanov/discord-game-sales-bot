import { describe, it, expect } from 'vitest'
import { findLabelComponent, findLabelTextInputValue } from './shared'
import { ComponentType } from 'discord-api-types/v10'
import type { APIModalSubmitInteraction } from 'discord-api-types/v10'

type SubmitComponents = APIModalSubmitInteraction['data']['components']

const buildComponents = (
  entries: {
    customId: string
    type: ComponentType.TextInput | ComponentType.StringSelect
    value?: string
    values?: string[]
  }[]
): SubmitComponents =>
  entries.map((e) => ({
    type: ComponentType.Label,
    component:
      e.type === ComponentType.TextInput
        ? {
            type: ComponentType.TextInput,
            custom_id: e.customId,
            value: e.value,
          }
        : {
            type: ComponentType.StringSelect,
            custom_id: e.customId,
            values: e.values ?? [],
          },
  })) as unknown as SubmitComponents

describe('findLabelComponent', () => {
  it('returns the inner component matching the given custom_id', () => {
    const components = buildComponents([
      { customId: 'a', type: ComponentType.TextInput, value: 'hello' },
      { customId: 'b', type: ComponentType.StringSelect, values: ['x'] },
    ])
    expect(findLabelComponent(components, 'b')).toMatchObject({
      custom_id: 'b',
      values: ['x'],
    })
  })

  it('returns undefined when no component matches', () => {
    const components = buildComponents([
      { customId: 'a', type: ComponentType.TextInput, value: 'hello' },
    ])
    expect(findLabelComponent(components, 'missing')).toBeUndefined()
  })
})

describe('findLabelTextInputValue', () => {
  it('returns the trimmed value for a matching TextInput', () => {
    const components = buildComponents([
      {
        customId: 'query',
        type: ComponentType.TextInput,
        value: '  hollow knight  ',
      },
    ])
    expect(findLabelTextInputValue(components, 'query')).toBe('hollow knight')
  })

  it('returns undefined when the matching component is not a TextInput', () => {
    const components = buildComponents([
      { customId: 'query', type: ComponentType.StringSelect, values: ['x'] },
    ])
    expect(findLabelTextInputValue(components, 'query')).toBeUndefined()
  })

  it('returns undefined when no component matches the custom_id', () => {
    const components = buildComponents([
      { customId: 'other', type: ComponentType.TextInput, value: 'x' },
    ])
    expect(findLabelTextInputValue(components, 'query')).toBeUndefined()
  })
})
