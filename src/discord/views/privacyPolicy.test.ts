// src/discord/views/privacyPolicy.test.ts
import { describe, it, expect } from 'vitest'
import { buildPrivacyPolicyMessage } from './privacyPolicy'
import { ComponentType, MessageFlags, ButtonStyle } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APITextDisplayComponent,
  APIActionRowComponent,
  APIButtonComponentWithURL,
} from 'discord-api-types/v10'

const getContainer = (
  result: ReturnType<typeof buildPrivacyPolicyMessage>
): APIContainerComponent => result.components[0] as APIContainerComponent

const getTexts = (container: APIContainerComponent) =>
  container.components.filter(
    (c): c is APITextDisplayComponent => c.type === ComponentType.TextDisplay
  )

describe('buildPrivacyPolicyMessage', () => {
  it('sets the Ephemeral and IsComponentsV2 flags', () => {
    const result = buildPrivacyPolicyMessage()
    expect(result.flags).toBe(
      MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
    )
  })

  it('wraps summary content in one Container', () => {
    const result = buildPrivacyPolicyMessage()
    expect(result.components[0]!.type).toBe(ComponentType.Container)
  })

  it('covers what is stored and how to remove it', () => {
    const texts = getTexts(getContainer(buildPrivacyPolicyMessage())).map(
      (t) => t.content
    )
    expect(texts.some((t) => t.includes('What we store'))).toBe(true)
    expect(texts.some((t) => t.includes('/forget-me'))).toBe(true)
    expect(texts.some((t) => t.includes('/config remove-alerts'))).toBe(true)
  })

  it('includes a Link-style button pointing to the full policy', () => {
    const result = buildPrivacyPolicyMessage()
    const row = result
      .components[1] as APIActionRowComponent<APIButtonComponentWithURL>
    expect(row.components[0]).toMatchObject({
      style: ButtonStyle.Link,
      url: 'https://discord-game-sales-bot.vercel.app/privacy',
    })
  })
})
