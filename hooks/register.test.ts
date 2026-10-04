import { test, expect, mock } from 'claude-code/testing'

const SPINNER = {
  plugin: 'sidecard-mod',
  surface: 'terminal',
  component: 'Spinner',
  props: { word: 'Thinking', message: null, suffix: '…', mode: 'thinking' },
} as const

test('spinner is left alone before any turn starts', async ($, on) => {
  // Stand in for Claude Code's own spinner drawing
  on('ui.render', async ($, e) => $.ui.resolve(e).Text({ children: ['engine spinner'] }))
  const ui = await $.ui.mount(SPINNER as never)
  expect(await ui.find({ type: 'Text', text: /engine spinner/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /◇/ })).toBeUndefined()
  await ui.unmount()
})

// `$.command.run` is typed with fields the engine stamps itself; the tests only need the text
const review = async ($: any, args: string): Promise<string> =>
  ((await $.command.run({ command: 'sidecard', args })) as { text?: string }).text ?? ''

const DAY = 86_400_000
const NOW = 100 * DAY
const entry = (id: string, category: string, body: string, shows: number[], extra = {}) => ({
  card: { id, category, body, ...extra },
  shows,
})
const HISTORY = {
  a: entry('a', 'french', 'pourtant\nhowever', [NOW - 5 * DAY]),
  b: entry('b', 'llm', 'Why do LLMs hallucinate?', [NOW - 2 * DAY], { reveal: { afterSeconds: 6, body: 'They predict plausible text.' } }),
  c: entry('c', 'french', 'depuis', [NOW - 3_600_000]),
}

test('/sidecard review lists the last 10 by default, newest first, answers included', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, { history: HISTORY })
  mock.env(on, { HOME: '/nonexistent' })
  const text = await review($, 'review')
  expect(text).toContain('Recent cards (3)')
  expect(text.indexOf('depuis')).toBeLessThan(text.indexOf('Why do LLMs'))
  expect(text.indexOf('Why do LLMs')).toBeLessThan(text.indexOf('pourtant'))
  expect(text).toContain('→ They predict plausible text.')
})

test('/sidecard review n limits the list; bad n and empty history say so', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, { history: HISTORY })
  mock.env(on, { HOME: '/nonexistent' })
  const two = await review($, 'review 2')
  expect(two).toContain('Recent cards (2)')
  expect(two).not.toContain('pourtant')
  expect(await review($, 'review abc')).toContain('Usage')
  expect(await review($, 'review 0')).toContain('Usage')
})

test('/sidecard review with no history says there are no cards yet', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, {})
  mock.env(on, { HOME: '/nonexistent' })
  expect(await review($, 'review')).toContain('No cards yet')
})
