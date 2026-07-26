import { describe, it, expect } from 'vitest'
import { getInteractionUserId } from './getInteractionUserId'
import type { APIInteraction } from 'discord-api-types/v10'

describe('getInteractionUserId', () => {
  it('reads the id from member.user in a guild interaction', () => {
    const interaction = { member: { user: { id: '123' } } } as APIInteraction
    expect(getInteractionUserId(interaction)).toBe('123')
  })

  it('reads the id from user directly in a DM interaction', () => {
    const interaction = { user: { id: '456' } } as APIInteraction
    expect(getInteractionUserId(interaction)).toBe('456')
  })

  it('throws when neither member nor user is present', () => {
    const interaction = {} as APIInteraction
    expect(() => getInteractionUserId(interaction)).toThrow()
  })
})
