import { test, expect } from 'claude-code/testing'

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
