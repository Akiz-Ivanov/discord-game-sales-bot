import { describe, it, expect } from 'vitest'
import { buildAboutMessage } from './about'
import { ComponentType, MessageFlags, ButtonStyle } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APITextDisplayComponent,
  APIActionRowComponent,
  APIButtonComponentWithURL,
} from 'discord-api-types/v10'

const getContainer = (
  result: ReturnType<typeof buildAboutMessage>
): APIContainerComponent => result.components[0] as APIContainerComponent

const getTexts = (container: APIContainerComponent) =>
  container.components.filter(
    (c): c is APITextDisplayComponent => c.type === ComponentType.TextDisplay
  )

describe('buildAboutMessage', () => {
  it('sets the Ephemeral and IsComponentsV2 flags', () => {
    const result = buildAboutMessage()
    expect(result.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
  })

  it('wraps content in one Container', () => {
    const result = buildAboutMessage()
    expect(result.components[0]!.type).toBe(ComponentType.Container)
  })

  it('includes a header naming the bot', () => {
    const header = getTexts(getContainer(buildAboutMessage()))[0]!
    expect(header.content).toContain('About')
  })

  it('mentions both data sources by name', () => {
    const texts = getTexts(getContainer(buildAboutMessage())).map(
      (t) => t.content
    )
    expect(texts.some((t) => t.includes('IsThereAnyDeal'))).toBe(true)
    expect(texts.some((t) => t.includes('GamerPower'))).toBe(true)
  })

  it('links to /help and /privacy-policy in the footer note', () => {
    const texts = getTexts(getContainer(buildAboutMessage())).map(
      (t) => t.content
    )
    expect(texts.some((t) => t.includes('/help'))).toBe(true)
    expect(texts.some((t) => t.includes('/privacy-policy'))).toBe(true)
  })

  it('mentions /feedback in the built-by-one-person line', () => {
    const texts = getTexts(getContainer(buildAboutMessage())).map(
      (t) => t.content
    )
    expect(texts.some((t) => t.includes('/feedback'))).toBe(true)
  })

  it('includes a Link-style button pointing to GitHub', () => {
    const result = buildAboutMessage()
    const row = result
      .components[1] as APIActionRowComponent<APIButtonComponentWithURL>
    expect(row.components[0]).toMatchObject({
      style: ButtonStyle.Link,
      url: 'https://github.com/Akiz-Ivanov/discord-game-sales-bot',
    })
  })
})
