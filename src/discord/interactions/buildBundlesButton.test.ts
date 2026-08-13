import { describe, it, expect } from 'vitest'
import { buildBundlesButton } from './buildBundlesButton'
import { ButtonStyle } from 'discord-api-types/v10'

describe('buildBundlesButton', () => {
  it('builds a Primary-style button keyed by the given itadId', () => {
    const row = buildBundlesButton('itad-1')

    expect(row.components[0]).toMatchObject({
      style: ButtonStyle.Primary,
      label: '📦 Show bundles',
      custom_id: 'price_bundles:itad-1',
    })
  })
})
