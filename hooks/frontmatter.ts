import type { Card } from './cards'

export type Input = { key: string; default: string; options: string[] }
export type Category = {
  name: string
  title: string
  color: string
  mode: 'read' | 'delayed'
  revealAfter: number
  model: string
  inputs: Input[]
  prompt: string
}

const COLORS = ['cyan', 'green', 'magenta', 'yellow', 'blue', 'red', 'white']

/**
 * A category file: flat `key: value` frontmatter between `---` lines, then the prompt.
 * Inputs are `input.<key>: <default> | <option>, <option>, ...`.
 */
export function parseCategory(src: string): Category | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src)
  if (!m) return null
  const meta: Record<string, string> = {}
  const inputs: Input[] = []
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 1 || line.trimStart().startsWith('#')) continue
    const key = line.slice(0, i).trim()
    const value = line.slice(i + 1).trim()
    if (key.startsWith('input.')) {
      const [def, opts = ''] = value.split('|')
      const options = opts.split(',').map((s) => s.trim()).filter(Boolean)
      const d = def.trim()
      if (d) inputs.push({ key: key.slice(6), default: d, options: options.includes(d) ? options : [d, ...options] })
    } else meta[key] = value
  }
  const name = (meta.name ?? '').toLowerCase()
  if (!/^[a-z0-9_-]{1,40}$/.test(name) || !m[2].trim()) return null
  return {
    name,
    title: meta.title || name,
    color: COLORS.includes(meta.color) ? meta.color : 'white',
    mode: meta.mode === 'read' ? 'read' : 'delayed',
    revealAfter: Math.min(30, Math.max(2, Number(meta.revealAfter) || 6)),
    model: meta.model || 'haiku',
    inputs,
    prompt: m[2].trim(),
  }
}

/** Replace {{key}} with the chosen value, or the input's default. */
export function fill(prompt: string, inputs: Input[], values: Record<string, string>): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (_, k: string) => values[k] ?? inputs.find((i) => i.key === k)?.default ?? '')
}

export function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** The model's reply: a JSON array of { body, answer? }. Anything malformed is dropped. */
export function parseCards(text: string, cat: Pick<Category, 'name' | 'mode' | 'revealAfter'>): Card[] {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) return []
  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const out: Card[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const { body, answer } = r as { body?: unknown; answer?: unknown }
    if (typeof body !== 'string' || body.length < 3 || body.length > 500) continue
    const reveal =
      cat.mode === 'delayed' && typeof answer === 'string' && answer.trim() && answer.length <= 400
        ? { afterSeconds: cat.revealAfter, body: answer.trim() }
        : undefined
    out.push({ id: 'gen-' + hash(cat.name + body), category: cat.name, body: body.trim(), ...(reveal ? { reveal } : {}) })
  }
  return out
}
