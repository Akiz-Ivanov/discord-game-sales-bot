import { describe, it, expect } from 'vitest'
import { getInteractionGuildId } from './getInteractionGuildId'
import type { APIInteraction } from 'discord-api-types/v10'

describe('getInteractionGuildId', () => {
  it('reads the guild id from a guild interaction', () => {
    const interaction = { guild_id: '999' } as APIInteraction
    expect(getInteractionGuildId(interaction)).toBe('999')
  })

  it('throws when guild_id is absent (e.g. a DM interaction)', () => {
    const interaction = {} as APIInteraction
    expect(() => getInteractionGuildId(interaction)).toThrow()
  })
})
