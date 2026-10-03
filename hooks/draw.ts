import type { Card } from './cards'

const MAX_INNER = 56

// Wrap a line to `width` columns on spaces; hard-cut words that are too long
export function wrap(line: string, width: number): string[] {
  if (line.length <= width) return [line]
  const out: string[] = []
  let cur = ''
  for (const word of line.split(' ')) {
    if (cur && (cur + ' ' + word).length > width) {
      out.push(cur)
      cur = word
    } else cur = cur ? cur + ' ' + word : word
    while (cur.length > width) {
      out.push(cur.slice(0, width))
      cur = cur.slice(width)
    }
  }
  if (cur) out.push(cur)
  return out
}

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length))

/** What the footer says: a countdown while a delayed answer is coming, the answer once it is. */
export function footer(card: Card, shownFor: number): { hint: string | null; answer: string[] } {
  if (!card.reveal) return { hint: null, answer: [] }
  const left = Math.ceil(card.reveal.afterSeconds - shownFor)
  if (left > 0) {
    const total = card.reveal.afterSeconds
    const done = Math.max(0, Math.min(total, total - left))
    return { hint: `answer in ${left}s ${'▰'.repeat(done)}${'▱'.repeat(total - done)}`, answer: [] }
  }
  return { hint: null, answer: card.reveal.body.split('\n') }
}

/** A boxed card: `╭─ sidecard · french ─╮`, bold headword, countdown, then the answer. */
export function drawCard(
  ui: { Box: any; Text: any },
  card: Card,
  opts: { label: string; color: string; shownFor: number; columns: number },
) {
  const { Box, Text } = ui
  const { color } = opts
  const maxInner = Math.max(24, Math.min(MAX_INNER, opts.columns - 6))
  const body = card.body.split('\n').flatMap((l) => wrap(l, maxInner))
  const f = footer(card, opts.shownFor)
  const answer = f.answer.flatMap((l) => wrap(l, maxInner))
  const title = ' sidecard · ' + opts.label + ' '
  const hint = f.hint ? '┄ ' + f.hint : ''
  const inner = Math.max(title.length + 2, hint.length, ...body.map((l) => l.length), ...answer.map((l) => l.length))
  const W = inner + 2

  const edge = (s: string) => Text({ color, dimColor: true, children: [s] })
  const row = (text: string, o: Record<string, unknown> = {}) =>
    Box({
      flexDirection: 'row',
      children: [edge('│ '), Text({ ...o, children: [pad(text, inner)] }), edge(' │')],
    })

  return Box({
    flexDirection: 'column',
    children: [
      Box({
        flexDirection: 'row',
        children: [
          edge('╭─'),
          Text({ color, bold: true, children: [title] }),
          edge('─'.repeat(Math.max(0, W - 2 - title.length)) + '╮'),
        ],
      }),
      ...body.map((l, i) => row(l, i === 0 ? { bold: true } : {})),
      ...(hint ? [row(hint, { dimColor: true, italic: true })] : []),
      ...(answer.length
        ? [edge('├' + '┄'.repeat(W) + '┤'), ...answer.map((l) => row(l, { color: 'green' }))]
        : []),
      edge('╰' + '─'.repeat(W) + '╯'),
    ],
  })
}

/** How long a card stays: long enough to read a delayed answer after it arrives. */
export const holdMs = (card: Card, base = 20_000) =>
  card.reveal ? Math.max(base, card.reveal.afterSeconds * 1000 + 8_000) : base
