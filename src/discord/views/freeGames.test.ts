import { describe, it, expect } from 'vitest'
import {
  buildFreeGamesMessage,
  MAX_GAMES_PER_MESSAGE,
  MAX_GAMES_PER_MESSAGE_RICH,
} from './freeGames'
import { ComponentType } from 'discord-api-types/v10'
import type {
  APIContainerComponent,
  APISectionComponent,
  APITextDisplayComponent,
} from 'discord-api-types/v10'
import { makeGiveaway } from '@/test/factories'

const getContainer = (r: ReturnType<typeof buildFreeGamesMessage>) =>
  r.components![0] as APIContainerComponent

//* Every giveaway entry + the trailing "+N more" line (if present) is a
//* TextDisplay; the header is also a TextDisplay, so this slices it off
//* by index rather than filtering by type.
const getEntryTexts = (c: APIContainerComponent) =>
  c.components
    .filter(
      (x): x is APITextDisplayComponent => x.type === ComponentType.TextDisplay
    )
    .slice(1) // drop the header

describe('buildFreeGamesMessage', () => {
  it('sets the IsComponentsV2 flag', () => {
    expect(buildFreeGamesMessage([makeGiveaway()]).flags).toBeDefined()
  })

  it('builds one entry per giveaway with title link, worth, and platforms', () => {
    const content = getEntryTexts(
      getContainer(buildFreeGamesMessage([makeGiveaway()]))
    )[0].content
    expect(content).toContain(
      '[Moonlighter](https://www.gamerpower.com/open/moonlighter-steam-giveawaway)'
    )
    expect(content).toContain('$19.99')
    expect(content).toContain('PC, Steam')
  })

  it('shows a formatted end date when present', () => {
    const content = getEntryTexts(
      getContainer(buildFreeGamesMessage([makeGiveaway()]))
    )[0].content
    expect(content).toContain('Free until Aug 9')
  })

  it('omits the end date line when end_date is N/A', () => {
    const content = getEntryTexts(
      getContainer(buildFreeGamesMessage([makeGiveaway({ end_date: 'N/A' })]))
    )[0].content
    expect(content).not.toContain('Free until')
  })

  it('omits worth from the details line when worth is N/A', () => {
    const content = getEntryTexts(
      getContainer(buildFreeGamesMessage([makeGiveaway({ worth: 'N/A' })]))
    )[0].content
    expect(content).not.toContain('N/A')
    expect(content).toContain('PC, Steam')
  })

  it(`caps display at ${MAX_GAMES_PER_MESSAGE} games per page`, () => {
    const giveaways = Array.from(
      { length: MAX_GAMES_PER_MESSAGE + 2 },
      (_, i) => makeGiveaway({ id: i, title: `Game ${i}` })
    )
    const container = getContainer(buildFreeGamesMessage(giveaways))
    expect(getEntryTexts(container)).toHaveLength(MAX_GAMES_PER_MESSAGE)
  })

  it('uses singular phrasing for exactly one game', () => {
    const header = getContainer(buildFreeGamesMessage([makeGiveaway()]))
      .components[0] as APITextDisplayComponent
    expect(header.content).toContain('1 free game on PC')
  })

  it('uses plural phrasing for multiple games', () => {
    const header = getContainer(
      buildFreeGamesMessage([makeGiveaway(), makeGiveaway({ id: 2 })])
    ).components[0] as APITextDisplayComponent
    expect(header.content).toContain('2 free games on PC')
  })

  it('strips a trailing " Giveaway" suffix from the title', () => {
    const content = getEntryTexts(
      getContainer(
        buildFreeGamesMessage([
          makeGiveaway({ title: 'Some Game (Steam) Giveaway' }),
        ])
      )
    )[0].content
    expect(content).toContain('[Some Game (Steam)]')
    expect(content).not.toContain('Giveaway')
  })

  it('renders Section + Thumbnail accessory in rich mode', () => {
    const giveaway = makeGiveaway({
      thumbnail: 'https://example.com/thumb.jpg',
    })
    const result = buildFreeGamesMessage([giveaway], 0, true)
    const container = result.components![0] as APIContainerComponent
    const sections = container.components.filter(
      (c) => c.type === ComponentType.Section
    ) as APISectionComponent[]

    expect(sections).toHaveLength(1)
    expect(sections[0].accessory).toMatchObject({
      type: ComponentType.Thumbnail,
      media: { url: 'https://example.com/thumb.jpg' },
    })
  })

  it('uses the rich pagination prefix and smaller page size when rich', () => {
    const giveaways = Array.from(
      { length: MAX_GAMES_PER_MESSAGE_RICH + 1 },
      (_, i) => makeGiveaway({ id: i })
    )
    const result = buildFreeGamesMessage(giveaways, 0, true)
    expect(result.components).toHaveLength(2) // container + nav row
  })
})

describe('pagination', () => {
  const buildGiveaways = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      makeGiveaway({ id: i, title: `Game ${i}` })
    )

  it('omits the nav row when everything fits on one page', () => {
    const result = buildFreeGamesMessage(buildGiveaways(MAX_GAMES_PER_MESSAGE))
    expect(result.components).toHaveLength(1)
  })

  it('adds a nav row once giveaways exceed one page', () => {
    const giveaways = Array.from(
      { length: MAX_GAMES_PER_MESSAGE + 2 },
      (_, i) => makeGiveaway({ id: i })
    )
    const result = buildFreeGamesMessage(giveaways)
    expect(result.components).toHaveLength(2)
  })

  it('shows the correct page of entries', () => {
    const giveaways = buildGiveaways(MAX_GAMES_PER_MESSAGE + 1)
    const container = getContainer(buildFreeGamesMessage(giveaways, 1))
    const entries = getEntryTexts(container)
    expect(entries).toHaveLength(1)
    expect(entries[0].content).toContain(`Game ${MAX_GAMES_PER_MESSAGE}`)
  })

  it('clamps an out-of-range page to the last page', () => {
    const giveaways = buildGiveaways(MAX_GAMES_PER_MESSAGE + 1)
    const container = getContainer(buildFreeGamesMessage(giveaways, 99))
    expect(getEntryTexts(container)[0].content).toContain(
      `Game ${MAX_GAMES_PER_MESSAGE}`
    )
  })
})
