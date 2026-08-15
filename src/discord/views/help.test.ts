import { describe, it, expect } from 'vitest'
import { buildHelpMessage } from './help'
import { ComponentType, MessageFlags } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'

const getContainer = (
  result: ReturnType<typeof buildHelpMessage>
): APIContainerComponent => result.components[0] as APIContainerComponent

const getTexts = (container: APIContainerComponent) =>
  container.components.filter(
    (c): c is APITextDisplayComponent => c.type === ComponentType.TextDisplay
  )

describe('buildHelpMessage', () => {
  it('sets the Ephemeral and IsComponentsV2 flags', () => {
    const result = buildHelpMessage()
    expect(result.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
  })

  it('wraps everything in exactly one Container component', () => {
    const result = buildHelpMessage()
    expect(result.components).toHaveLength(1)
    expect(result.components[0].type).toBe(ComponentType.Container)
  })

  it('sets the container accent color', () => {
    expect(getContainer(buildHelpMessage()).accent_color).toBe(0x5865f2)
  })

  it('includes a header with the bot name and description', () => {
    const header = getTexts(getContainer(buildHelpMessage()))[0]
    expect(header.content).toContain('Game Sales Bot')
    expect(header.content).toContain('Track game prices')
  })

  it('lists all six commands', () => {
    const texts = getTexts(getContainer(buildHelpMessage())).map(
      (t) => t.content
    )
    expect(texts.some((t) => t.includes('/price'))).toBe(true)
    expect(texts.some((t) => t.includes('/wishlist'))).toBe(true)
    expect(texts.some((t) => t.includes('/free'))).toBe(true)
    expect(texts.some((t) => t.includes('/forget-me'))).toBe(true)
    expect(texts.some((t) => t.includes('/privacy-policy'))).toBe(true)
    expect(texts.some((t) => t.includes('/config'))).toBe(true)
  })

  it('marks the config command as admin-only', () => {
    const configText = getTexts(getContainer(buildHelpMessage())).find((t) =>
      t.content.includes('/config')
    )
    expect(configText?.content).toContain('Admin only')
  })

  it('has no trailing separator after the last command entry', () => {
    const container = getContainer(buildHelpMessage())
    const last = container.components[container.components.length - 1]
    expect(last.type).toBe(ComponentType.TextDisplay)
  })
})
