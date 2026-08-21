import { describe, it, expect } from 'vitest'
import { buildGameSelectButtons } from './buildGameSelectButtons'
import { ComponentType, ButtonStyle } from 'discord-api-types/v10'
import { game } from '@/test/factories'

describe('buildGameSelectButtons', () => {
  it('builds one button per match with the given custom_id prefix', () => {
    const matches = [game, { ...game, id: 'id-2', title: 'Other Game' }]
    const row = buildGameSelectButtons(matches, 'price_select')

    expect(row.type).toBe(ComponentType.ActionRow)
    expect(row.components).toHaveLength(2)
    expect(row.components[0]).toMatchObject({
      type: ComponentType.Button,
      style: ButtonStyle.Secondary,
      label: game.title,
      custom_id: `price_select:${game.id}`,
    })
  })

  it('caps at 5 buttons even with more matches', () => {
    const matches = Array.from({ length: 8 }, (_, i) => ({
      ...game,
      id: `id-${i}`,
      title: `Game ${i}`,
    }))
    expect(
      buildGameSelectButtons(matches, 'price_select').components
    ).toHaveLength(5)
  })

  it('truncates labels longer than 80 characters', () => {
    const row = buildGameSelectButtons(
      [{ ...game, title: 'A'.repeat(120) }],
      'price_select'
    )
    expect(row.components[0]!.label).toHaveLength(80)
  })
})
