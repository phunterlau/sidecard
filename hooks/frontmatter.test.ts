import { test, expect } from 'claude-code/testing'
import { parseCategory, fill, parseCards } from './frontmatter'
import { footer } from './draw'

const MD = `---
name: french
title: French
color: cyan
mode: delayed
revealAfter: 6
input.level: A2 | A1, A2, B1
---
Teach French at {{level}}.`

test('category file parses with inputs and a default', async () => {
  const c = parseCategory(MD)!
  expect(c.name).toBe('french')
  expect(c.inputs[0]).toEqual({ key: 'level', default: 'A2', options: ['A1', 'A2', 'B1'] })
  expect(fill(c.prompt, c.inputs, {})).toBe('Teach French at A2.')
  expect(fill(c.prompt, c.inputs, { level: 'B1' })).toBe('Teach French at B1.')
})

test('a file without frontmatter or a name is ignored', async () => {
  expect(parseCategory('just text')).toBeNull()
  expect(parseCategory('---\ntitle: x\n---\nbody')).toBeNull()
})

test('model replies: fenced JSON parses, junk is dropped, delayed answers kept', async () => {
  const cat = { name: 'french', mode: 'delayed', revealAfter: 6 } as const
  const out = parseCards('```json\n[{"body":"du coup\\nso","answer":"ok"},{"nope":1},{"body":"x"}]\n```', cat)
  expect(out.length).toBe(1)
  expect(out[0].reveal?.afterSeconds).toBe(6)
  expect(parseCards('not json', cat)).toEqual([])
})

test('delayed card shows a countdown, then the answer', async () => {
  const card = { id: 'a', category: 'x', body: 'q', reveal: { afterSeconds: 6, body: 'a1' } }
  expect(footer(card, 2).hint).toContain('answer in 4s')
  expect(footer(card, 6).answer).toEqual(['a1'])
})
