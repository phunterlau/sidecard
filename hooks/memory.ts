import type { Card } from './cards'

const DAY = 86_400_000

export type MemoryOptions = {
  /** Stability S after a card's first showing: retention is exp(-elapsed / S). */
  initialStabilityMs: number
  /** How strongly a well-spaced re-showing grows S. 0 turns growth off. */
  growth: number
  /** A card is due for resurfacing once estimated retention falls below this. */
  resurfaceBelow: number
  /** Cards with a lower `value` never resurface. */
  minValue: number
  /** Most cards kept, and most showings kept per card. */
  maxCards: number
  maxShows: number
}

export const DEFAULT_MEMORY: MemoryOptions = {
  initialStabilityMs: DAY,
  growth: 2,
  resurfaceBelow: 0.5,
  minValue: 2,
  maxCards: 300,
  maxShows: 30,
}

/** Every card shown, keyed by card id, with when (ms since the epoch, ascending). Plain JSON for `$.store`. */
export type History = Record<string, { card: Card; shows: number[] }>

export type ReviewItem = { card: Card; shows: number[]; lastShownAt: number; count: number; retention: number }

/** Ebbinghaus forgetting curve: the fraction still remembered after `elapsedMs`. */
export const retention = (elapsedMs: number, stability: number) => Math.exp(-Math.max(0, elapsedMs) / stability)

/**
 * Stability rebuilt from the whole showing history. Each re-showing multiplies S by
 * 1 + growth * (1 - R), R being what had been retained at that moment: a re-showing as the memory
 * fades strengthens it a lot, a back-to-back repeat (R close to 1) barely at all.
 */
export function stabilityOf(shows: number[], o: MemoryOptions = DEFAULT_MEMORY): number {
  let s = o.initialStabilityMs
  for (let i = 1; i < shows.length; i++) s *= 1 + o.growth * (1 - retention((shows[i] ?? 0) - (shows[i - 1] ?? 0), s))
  return s
}

/** Estimated retention at `now`, measured from the most recent showing. */
export function retentionAt(shows: number[], now: number, o: MemoryOptions = DEFAULT_MEMORY): number {
  const last = shows[shows.length - 1]
  return last === undefined ? 0 : retention(now - last, stabilityOf(shows, o))
}

const valueOf = (c: Card) => c.value ?? 1
const lastShow = (shows: number[]) => shows[shows.length - 1] ?? 0

/** A copy of `h` with one more showing of `card` at `t`; the oldest low-value cards go when over the cap. */
export function record(h: History, card: Card, t: number, o: MemoryOptions = DEFAULT_MEMORY): History {
  const prev = h[card.id]
  const out: History = { ...h, [card.id]: { card, shows: [...(prev?.shows ?? []), t].slice(-o.maxShows) } }
  const ids = Object.keys(out)
  if (ids.length <= o.maxCards) return out
  const at = (id: string) => out[id]!
  ids
    .sort((a, b) => Number(valueOf(at(a).card) >= o.minValue) - Number(valueOf(at(b).card) >= o.minValue) || lastShow(at(a).shows) - lastShow(at(b).shows))
    .slice(0, ids.length - o.maxCards)
    .forEach((id) => delete out[id])
  return out
}

/** The `n` most recently shown distinct cards, newest first. */
export function recent(h: History, n: number, now: number, o: MemoryOptions = DEFAULT_MEMORY): ReviewItem[] {
  return Object.values(h)
    .filter((e) => e.shows.length > 0)
    .sort((a, b) => lastShow(b.shows) - lastShow(a.shows))
    .slice(0, n)
    .map((e) => ({
      card: e.card,
      shows: e.shows,
      lastShownAt: lastShow(e.shows),
      count: e.shows.length,
      retention: retentionAt(e.shows, now, o),
    }))
}

/** A high-value card whose retention has decayed, picked weighted by value * forgotten. */
export function pickDue(
  h: History,
  now: number,
  allowed: (category: string) => boolean,
  rng: () => number = Math.random,
  o: MemoryOptions = DEFAULT_MEMORY,
): Card | null {
  const due: { card: Card; w: number }[] = []
  for (const e of Object.values(h)) {
    if (valueOf(e.card) < o.minValue || !allowed(e.card.category)) continue
    const r = retentionAt(e.shows, now, o)
    if (r < o.resurfaceBelow) due.push({ card: e.card, w: valueOf(e.card) * (1 - r) })
  }
  if (due.length === 0) return null
  let x = rng() * due.reduce((a, d) => a + d.w, 0)
  for (const d of due) if ((x -= d.w) < 0) return d.card
  return due[due.length - 1]?.card ?? null
}

function ago(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 48 * 60) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

/** Text for `/sidecard review`: newest first, answers included, with estimated retention. */
export function formatReview(items: ReviewItem[], now: number): string {
  if (items.length === 0) return 'No cards yet. They appear while Claude is working.'
  const out = [`Recent cards (${items.length})`]
  items.forEach((it, i) => {
    out.push(
      '',
      `${i + 1}. ${it.card.category} · ${ago(now - it.lastShownAt)} · seen ${it.count}× · memory ${Math.round(it.retention * 100)}%`,
      ...it.card.body.split('\n').map((l) => `   ${l}`.trimEnd()),
    )
    if (it.card.reveal) out.push('', ...it.card.reveal.body.split('\n').map((l) => `   → ${l}`))
  })
  return out.join('\n')
}

/** Tolerant read of whatever `$.store` holds under `history`: anything malformed is dropped. */
export function parseHistory(raw: unknown): History {
  const out: History = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [id, e] of Object.entries(raw as Record<string, any>)) {
    const c = e?.card
    if (!c || typeof c.id !== 'string' || typeof c.category !== 'string' || typeof c.body !== 'string') continue
    if (!Array.isArray(e.shows) || !e.shows.length || !e.shows.every((t: unknown) => typeof t === 'number')) continue
    out[id] = { card: c as Card, shows: [...e.shows].sort((a: number, b: number) => a - b) }
  }
  return out
}
