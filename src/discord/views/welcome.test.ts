import { describe, it, expect } from 'vitest'
import { buildWelcomeMessage } from './welcome'
import { ComponentType, MessageFlags, ButtonStyle } from 'discord-api-types/v10'
import type {
  APIActionRowComponent,
  APIButtonComponentWithCustomId,
  APIContainerComponent,
  APISectionComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'

const getContainer = (
  result: ReturnType<typeof buildWelcomeMessage>
): APIContainerComponent => result.components![0] as APIContainerComponent

const getTexts = (container: APIContainerComponent) =>
  container.components.filter(
    (c): c is APITextDisplayComponent => c.type === ComponentType.TextDisplay
  )

const getSections = (container: APIContainerComponent) =>
  container.components.filter(
    (c): c is APISectionComponent => c.type === ComponentType.Section
  )

const getUtilityRow = (
  result: ReturnType<typeof buildWelcomeMessage>
): APIActionRowComponent<APIButtonComponentWithCustomId> | undefined =>
  result.components![1] as
    APIActionRowComponent<APIButtonComponentWithCustomId> | undefined

describe('buildWelcomeMessage — rich variant (default)', () => {
  it('sets the IsComponentsV2 flag without Ephemeral', () => {
    expect(buildWelcomeMessage().flags).toBe(MessageFlags.IsComponentsV2)
  })

  it('sets the container accent color', () => {
    expect(getContainer(buildWelcomeMessage()).accent_color).toBe(0x00d4ff)
  })

  it('uses the rich header with the pitch sentence', () => {
    const header = getTexts(getContainer(buildWelcomeMessage()))[0]!
    expect(header.content).toContain('Hey, thanks for having me here')
  })

  it('builds one Section per entry', () => {
    expect(getSections(getContainer(buildWelcomeMessage()))).toHaveLength(3)
  })

  it('includes the footer pointing to /help', () => {
    const texts = getTexts(getContainer(buildWelcomeMessage())).map(
      (t) => t.content
    )
    expect(texts.some((t) => t.includes('/help'))).toBe(true)
  })

  it('appends a utility row with Help and Feedback buttons', () => {
    const row = getUtilityRow(buildWelcomeMessage())
    expect(row?.type).toBe(ComponentType.ActionRow)
    expect(row?.components).toHaveLength(2)
    expect(row?.components[0]).toMatchObject({
      custom_id: 'welcome_help',
      style: ButtonStyle.Secondary,
    })
    expect(row?.components[1]).toMatchObject({
      custom_id: 'welcome_feedback',
      style: ButtonStyle.Secondary,
    })
  })

  it('gives each entry its own custom_id and button style', () => {
    const sections = getSections(getContainer(buildWelcomeMessage()))
    expect(sections[0]!.accessory).toMatchObject({
      custom_id: 'welcome_check_price',
      style: ButtonStyle.Primary,
    })
    expect(sections[1]!.accessory).toMatchObject({
      custom_id: 'welcome_my_wishlist',
      style: ButtonStyle.Success,
    })
    expect(sections[2]!.accessory).toMatchObject({
      custom_id: 'welcome_free_games',
    })
  })
})

describe('buildWelcomeMessage — lean variant (ephemeral)', () => {
  it('sets both the IsComponentsV2 and Ephemeral flags', () => {
    expect(buildWelcomeMessage(true).flags).toBe(
      MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    )
  })

  it('uses the lean header without the pitch sentence', () => {
    const header = getTexts(getContainer(buildWelcomeMessage(true)))[0]!
    expect(header.content).not.toContain('Hey, thanks for having me here')
    expect(header.content).toContain("Here's what I can do for you")
  })

  it('omits the footer', () => {
    const texts = getTexts(getContainer(buildWelcomeMessage(true))).map(
      (t) => t.content
    )
    expect(texts.some((t) => t.includes('/help'))).toBe(false)
  })

  it('omits the utility row entirely', () => {
    expect(buildWelcomeMessage(true).components).toHaveLength(1)
  })

  it('still builds all three entry Sections', () => {
    expect(getSections(getContainer(buildWelcomeMessage(true)))).toHaveLength(3)
  })
})
