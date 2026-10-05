import { test, expect } from 'claude-code/testing'
import { cards } from './cards'

test('bundled card ids are unique and belong to a bundled category', async () => {
  expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length)
  const cats = new Set(['french', 'python-advanced', 'ml-general', 'llm'])
  for (const c of cards) expect(cats.has(c.category)).toBe(true)
})

test('bundled cards are short enough to read in a few seconds', async () => {
  for (const c of cards) {
    const lines = c.body.split('\n')
    expect(lines.length).toBeLessThanOrEqual(8)
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(56) // draw.ts wraps beyond this
    if (c.reveal) expect(c.reveal.body.split('\n').length).toBeLessThanOrEqual(3)
  }
})

test('a card that asks "Think for a moment" always has an answer to reveal', async () => {
  for (const c of cards) if (/Think for a moment/.test(c.body)) expect(c.reveal).toBeDefined()
})
