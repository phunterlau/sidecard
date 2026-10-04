import { test, expect } from 'claude-code/testing'
import { cards, type Card } from './cards'
import { parseCards } from './frontmatter'
import { formatReview, parseHistory, pickDue, recent, record, retention, retentionAt, stabilityOf, type History } from './memory'

const H = 3_600_000
const D = 24 * H
const card = (id: string, value?: number, category = 'x'): Card => ({ id, category, body: id, ...(value ? { value } : {}) })
const any = () => true
const first = () => 0

test('forgetting curve starts at 1, decays, and clamps clock skew', async () => {
  expect(retention(0, D)).toBe(1)
  expect(retention(H, D)).toBeGreaterThan(retention(2 * H, D))
  expect(retention(30 * D, D)).toBeGreaterThan(0)
  expect(retention(-5, D)).toBe(1)
})

test('a spaced re-showing strengthens memory far more than a back-to-back repeat', async () => {
  const once = stabilityOf([0])
  expect(stabilityOf([0, 60_000])).toBeLessThan(once * 1.01)
  expect(stabilityOf([0, D])).toBeGreaterThan(once * 2)
  expect(stabilityOf([0, D, 3 * D])).toBeGreaterThan(stabilityOf([0, D]))
})

test('retention is measured from the last showing using the full history', async () => {
  expect(retentionAt([0, D], 2 * D)).toBeGreaterThan(retentionAt([0], 2 * D))
  expect(retentionAt([], D)).toBe(0)
})

test('record is immutable, keeps showings ascending and caps their number', async () => {
  const h0: History = {}
  const h1 = record(h0, card('a'), 1)
  const h2 = record(h1, card('a'), 2)
  expect(h0).toEqual({})
  expect(h1.a!.shows).toEqual([1])
  expect(h2.a!.shows).toEqual([1, 2])
  let h = h0
  for (let i = 0; i < 50; i++) h = record(h, card('a'), i)
  expect(h.a!.shows.length).toBe(30)
  expect(h.a!.shows[29]).toBe(49)
})

test('over the cap, the oldest low-value cards go first and high-value ones stay', async () => {
  let h: History = {}
  h = record(h, card('keep', 2), 0) // oldest of all, but high value
  for (let i = 1; i <= 305; i++) h = record(h, card('c' + i), i)
  expect(Object.keys(h).length).toBe(300)
  expect(h.keep).toBeDefined()
  expect(h.c1).toBeUndefined()
  expect(h.c305).toBeDefined()
})

test('pickDue needs high value, decayed retention and an allowed category', async () => {
  let h: History = {}
  h = record(h, card('hv', 2, 'french'), 0)
  h = record(h, card('lv', undefined, 'french'), 0) // default value 1: never resurfaces
  h = record(h, card('off', 3, 'gone'), 0)
  const french = (c: string) => c === 'french'
  expect(pickDue(h, H, french, first)).toBeNull() // seen an hour ago
  expect(pickDue(h, 2 * D, french, first)?.id).toBe('hv')
  expect(pickDue(h, 2 * D, (c) => c === 'gone', first)?.id).toBe('off')
  expect(pickDue(h, 2 * D, () => false, first)).toBeNull()
  expect(pickDue({}, 2 * D, any, first)).toBeNull()
})

test('the more valuable and forgotten a card, the likelier it is picked', async () => {
  let h: History = {}
  h = record(h, card('v2', 2), 0)
  h = record(h, card('v9', 9), 0)
  let seed = 7
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  let v9 = 0
  for (let i = 0; i < 400; i++) if (pickDue(h, 5 * D, any, rng)!.id === 'v9') v9++
  expect(v9).toBeGreaterThan(250)
})

test('a resurfacing is itself a showing, so the next one is spaced further out', async () => {
  let h = record({}, card('a', 2), 0)
  expect(pickDue(h, 2 * D, any, first)?.id).toBe('a')
  h = record(h, card('a', 2), 2 * D)
  expect(pickDue(h, 2 * D + H, any, first)).toBeNull()
  expect(retentionAt(h.a!.shows, 4 * D)).toBeGreaterThan(retentionAt([0], 4 * D))
})

test('recent lists distinct cards newest first with count and retention', async () => {
  let h: History = {}
  h = record(h, card('x'), 1 * H)
  h = record(h, card('y'), 2 * H)
  h = record(h, card('x'), 3 * H) // x shown again, so now newest
  const r = recent(h, 10, 4 * H)
  expect(r.map((i) => i.card.id)).toEqual(['x', 'y'])
  expect(r[0]!.count).toBe(2)
  expect(r[0]!.retention).toBeGreaterThan(0)
  expect(r[0]!.retention).toBeLessThan(1)
  expect(recent(h, 1, 4 * H).length).toBe(1)
})

test('review text: newest first, answers shown, empty state', async () => {
  expect(formatReview([], 0)).toContain('No cards yet')
  const c: Card = { id: 'q', category: 'french', body: 'Q?', reveal: { afterSeconds: 6, body: 'A!' } }
  const out = formatReview(recent(record({}, c, 0), 10, 3 * H), 3 * H)
  expect(out).toMatch(/1\. french · 3h ago · seen 1× · memory \d+%/)
  expect(out).toContain('Q?')
  expect(out).toContain('→ A!')
})

test('malformed stored history is dropped, valid entries survive', async () => {
  const good = { card: card('a', 2), shows: [5, 1] }
  const h = parseHistory({ a: good, b: { card: { id: 1 }, shows: [1] }, c: { card: card('c'), shows: [] }, d: 'junk' })
  expect(Object.keys(h)).toEqual(['a'])
  expect(h.a!.shows).toEqual([1, 5])
  expect(parseHistory(null)).toEqual({})
  expect(parseHistory('x')).toEqual({})
})

test('model-rated value is kept only as 2 or 3', async () => {
  const cat = { name: 'x', mode: 'read', revealAfter: 6 } as const
  const out = parseCards('[{"body":"aaa","value":3},{"body":"bbb","value":9},{"body":"ccc"},{"body":"ddd","value":2}]', cat)
  expect(out.map((c) => c.value)).toEqual([3, undefined, undefined, 2])
})

test('some, but not most, bundled cards are marked high value', async () => {
  const hi = cards.filter((c) => (c.value ?? 1) >= 2)
  expect(hi.length).toBeGreaterThanOrEqual(8)
  expect(hi.length).toBeLessThan(cards.length / 2)
})
