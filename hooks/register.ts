import type { Register } from 'claude-code'
import { cards as staticCards, type Card } from './cards'
import { drawCard, holdMs } from './draw'
import { fill, parseCards, parseCategory, type Category } from './frontmatter'

const MIN_WAIT_MS = 8_000
const GAP_MS = 45_000
const PANE = 'sidecard-menu'
const LOW_BUFFER = 3
const BATCH = 10
const SEEN_CAP = 80

const SYSTEM =
  'You write tiny flash cards for a developer who is waiting on a coding agent. ' +
  'Reply with ONLY a JSON array, no prose, no code fences. Each element is {"body": string, "answer"?: string}. ' +
  'body is at most 5 lines (use \\n), each line at most 52 characters. ' +
  'answer is a short reveal (at most 3 lines) shown a few seconds later. Never repeat a card.'

type Settings = { enabled: boolean; generate: boolean; off: string[]; values: Record<string, Record<string, string>> }
type Shown = { card: Card; cat: string; at: number }

const HELP =
  'Usage: /sidecard [menu|on|off|now|status|generate on|off|reload|<category> [key=value]]\n' +
  '  (no args)    open the category menu\n' +
  '  now          show a card right away\n' +
  '  <category>   toggle it; add key=value to set an input, e.g. french level=B1\n' +
  '  generate     use Claude Code\'s Haiku to write fresh cards (uses your plan quota)\n' +
  '  reload       rescan category files'

let settings: Settings = { enabled: true, generate: true, off: [], values: {} }
let cats: Category[] = []
const bufs = new Map<string, Card[]>()
const seen = new Map<string, string[]>()
const fallback = new Map<string, Card[]>()
const generating = new Set<string>()

let turnStart = 0
let working = false
let held = false
let current: Shown | null = null
let band: Shown | null = null
let lastShownEnd = -Infinity
let timerOn = false

const isOn = (name: string) => !settings.off.includes(name)
const valuesOf = (c: Category) => ({ ...Object.fromEntries(c.inputs.map((i) => [i.key, i.default])), ...settings.values[c.name] })
const sigOf = (c: Category) => JSON.stringify(valuesOf(c))
function save($: any) {
  return $.store.set('settings', settings)
}

async function discover($: any) {
  const dirs = [$.plugin.root + '/categories']
  const home = await $.env.get('HOME')
  if (home) dirs.push(home + '/.claude/sidecard/categories')
  const found = new Map<string, Category>()
  const scan = async (dir: string, depth: number) => {
    let entries: { name: string; kind: string }[]
    try {
      entries = await $.fs.list(dir)
    } catch {
      return
    }
    for (const en of entries) {
      if (en.kind === 'dir' && depth < 1) await scan(dir + '/' + en.name, depth + 1)
      if (en.kind !== 'file' || !en.name.endsWith('.md')) continue
      try {
        const src = await $.fs.read(dir + '/' + en.name)
        const c = typeof src === 'string' ? parseCategory(src) : null
        if (c) found.set(c.name, c)
      } catch {}
    }
  }
  for (const d of dirs) await scan(d, 0)
  cats = [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function takeStatic(name: string): Card | null {
  let q = fallback.get(name)
  if (!q || q.length === 0) {
    q = staticCards.filter((c) => c.category === name)
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[q[i], q[j]] = [q[j], q[i]]
    }
    fallback.set(name, q)
  }
  return q.pop() ?? null
}

function pick(): { card: Card; cat: Category } | null {
  const pool = cats.filter((c) => isOn(c.name))
  for (let n = pool.length; n > 0; n--) {
    const cat = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
    const card = bufs.get(cat.name)?.shift() ?? takeStatic(cat.name)
    if (card) return { card, cat }
  }
  return null
}

// Background: never awaited by a hook on the turn path, never called while drawing
async function refill($: any, cat: Category) {
  if (!settings.generate || generating.has(cat.name) || (bufs.get(cat.name)?.length ?? 0) >= LOW_BUFFER) return
  generating.add(cat.name)
  try {
    const sig = sigOf(cat)
    const prompt =
      fill(cat.prompt, cat.inputs, valuesOf(cat)) +
      `\n\nWrite ${BATCH} cards. ` +
      (cat.mode === 'delayed' ? 'Every card needs an "answer".' : 'Do not include "answer".')
    const r = await $.model.complete({ model: cat.model, system: SYSTEM, prompt, maxTokens: 2500, effort: 'low', timeoutMs: 60_000 })
    if (!r.isAnswered || sigOf(cat) !== sig) return // failed, or the inputs changed meanwhile
    const known = new Set(seen.get(cat.name) ?? [])
    const fresh = parseCards(r.text, cat).filter((c) => !known.has(c.id))
    if (fresh.length === 0) return
    const buf = [...(bufs.get(cat.name) ?? []), ...fresh]
    bufs.set(cat.name, buf)
    await $.store.set('buf:' + cat.name, { sig, cards: buf })
  } catch {
    // fall back to the bundled cards
  } finally {
    generating.delete(cat.name)
  }
}

function refillAll($: any) {
  if (!settings.enabled) return
  for (const c of cats) if (isOn(c.name)) void refill($, c)
}

function remember($: any, s: Shown) {
  const list = [...(seen.get(s.cat) ?? []), s.card.id].slice(-SEEN_CAP)
  seen.set(s.cat, list)
  void $.store.set('seen:' + s.cat, list)
}

async function showNow($: any): Promise<boolean> {
  const p = pick()
  if (!p) return false
  const at = await $.clock.now()
  const shown = { card: p.card, cat: p.cat.name, at }
  remember($, shown)
  held = false
  if (working) {
    current = shown
    band = null
  } else {
    band = shown
    current = null
  }
  $.ui.invalidate('ui.render')
  return true
}

const colorOf = (name: string) => cats.find((c) => c.name === name)?.color ?? 'white'
const labelOf = (name: string) => name


export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    const saved = await $.store.get('settings')
    if (saved && typeof saved === 'object') {
      const s = saved as Partial<Settings>
      settings = {
        enabled: s.enabled !== false,
        generate: s.generate !== false,
        off: Array.isArray(s.off) ? s.off : [],
        values: s.values && typeof s.values === 'object' ? s.values : {},
      }
    }
    await discover($)
    for (const c of cats) {
      const b = (await $.store.get('buf:' + c.name)) as { sig?: string; cards?: Card[] } | undefined
      if (b?.sig === sigOf(c) && Array.isArray(b.cards)) bufs.set(c.name, b.cards)
      const sn = await $.store.get('seen:' + c.name)
      if (Array.isArray(sn)) seen.set(c.name, sn as string[])
    }
    if (!timerOn) {
      timerOn = true
      // Redraw once a second, only while something that changes with time is on screen
      $.clock.every(1000, () => {
        if (working || band) $.ui.invalidate('ui.render')
      })
    }
    // Register commands last: a taken name throws
    await $.command.register({
      name: 'sidecard',
      description: 'Spinner learning cards: menu, on/off, now',
      argumentHint: '[menu|on|off|now|<category>]',
      immediate: true,
    })
    return next(e)
  })

  on('command.run', { command: 'sidecard' }, async ($, e) => {
    const [head = '', ...rest] = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const status = () =>
      `sidecard ${settings.enabled ? 'on' : 'off'} · generate ${settings.generate ? 'on (haiku)' : 'off'} · ` +
      cats.map((c) => (isOn(c.name) ? '✓' : '☐') + ' ' + c.name).join('  ')

    if (head === '' || head === 'menu') {
      await discover($)
      await $.ui.open({ id: PANE, title: 'sidecard', focus: true, closeOnEscape: true })
      return {}
    }
    if (head === 'help') return { text: status() + '\n' + HELP }
    if (head === 'status') return { text: status() }
    if (head === 'reload') {
      await discover($)
      return { text: 'Found ' + cats.length + ' categories: ' + cats.map((c) => c.name).join(', ') }
    }
    if (head === 'on' || head === 'off') {
      settings.enabled = head === 'on'
      current = band = null
      await save($)
      if (settings.enabled) refillAll($)
      return { text: status() }
    }
    if (head === 'generate') {
      settings.generate = rest[0] !== 'off'
      await save($)
      if (settings.generate) refillAll($)
      return { text: status() }
    }
    if (head === 'now') {
      return (await showNow($)) ? {} : { text: 'No cards available. Enable a category with /sidecard.' }
    }
    const cat = cats.find((c) => c.name === head)
    if (cat) {
      const kv = rest.find((r) => r.includes('='))
      if (kv) {
        const [k, v] = kv.split('=')
        const input = cat.inputs.find((i) => i.key === k)
        const value = input?.options.find((o) => o.toLowerCase() === v)
        if (!input || !value) return { text: `${cat.name}: ${k} must be one of ${(input?.options ?? []).join(', ') || '(no such input)'}` }
        settings.values[cat.name] = { ...settings.values[cat.name], [k]: value }
        bufs.delete(cat.name)
        settings.off = settings.off.filter((n) => n !== cat.name)
        await save($)
        void refill($, cat)
      } else {
        settings.off = isOn(cat.name) ? [...settings.off, cat.name] : settings.off.filter((n) => n !== cat.name)
        await save($)
      }
      return { text: status() }
    }
    return { text: 'Unknown option "' + head + '".\n' + HELP }
  })

  on('turn.start', async ($, e, next) => {
    turnStart = await $.clock.now()
    working = true
    held = false
    current = band = null
    refillAll($)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    band = null
    return next(e)
  })

  // Claude is working again after an attention hold
  on('tool.call', async ($, e, next) => {
    held = false
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    working = false
    current = null
    return next(e)
  })

  // Primary agent always wins: go dark when it needs the user
  on('classic.PermissionRequest', async ($, e, next) => {
    held = true
    current = null
    return next(e)
  })
  on('classic.Notification', { notification_type: ['permission_prompt', 'agent_needs_input', 'elicitation_dialog'] } as never, async ($, e, next) => {
    held = true
    current = null
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!settings.enabled || !working || held) return next(e)
    const now = await $.clock.now()

    if (current && now - current.at > holdMs(current.card)) {
      current = null
      lastShownEnd = now
    }
    if (!current && now - turnStart >= MIN_WAIT_MS && now - lastShownEnd >= GAP_MS) {
      const p = pick()
      if (p) {
        current = { card: p.card, cat: p.cat.name, at: now }
        remember($, current)
      }
    }
    if (!current) return next(e)

    const ui = $.ui.resolve(e)
    const card = drawCard(ui, current.card, {
      label: labelOf(current.cat),
      color: colorOf(current.cat),
      shownFor: (now - current.at) / 1000,
      columns: e.viewport?.columns ?? 80,
    })
    const theirs = await next(e)
    return ui.Box({ flexDirection: 'column', children: [theirs, card] })
  })

  // `/sidecard now` while no turn is running: there is no spinner, so draw in the band
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!band || e.props.hasSurvey || e.props.isWorking || !settings.enabled) return next(e)
    const now = await $.clock.now()
    if (now - band.at > holdMs(band.card)) {
      band = null
      return next(e)
    }
    const ui = $.ui.resolve(e)
    return drawCard(ui, band.card, {
      label: labelOf(band.cat),
      color: colorOf(band.cat),
      shownFor: (now - band.at) / 1000,
      columns: e.props.bodyColumns,
    })
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button, Select } = $.ui.resolve(e)
    const redraw = () => $.ui.invalidate('ui.render')

    const toggle = async (name: string) => {
      settings.off = isOn(name) ? [...settings.off, name] : settings.off.filter((n) => n !== name)
      redraw()
      await save($)
      const c = cats.find((x) => x.name === name)
      if (c && isOn(name)) void refill($, c)
    }
    const setInput = async (c: Category, key: string, value: string) => {
      settings.values[c.name] = { ...settings.values[c.name], [key]: value }
      bufs.delete(c.name)
      redraw()
      await save($)
      void refill($, c)
    }

    const blocks = cats.map((c, i) => {
      const vals = valuesOf(c)
      return Box({
        key: 'cat-' + c.name,
        flexDirection: 'column',
        children: [
          Box({
            flexDirection: 'row',
            columnGap: 2,
            children: [
              Button({
                key: 'toggle-' + c.name,
                label: (isOn(c.name) ? '✓ ' : '☐ ') + c.title,
                hotkey: i < 9 ? String(i + 1) : undefined,
                plain: true,
                dimColor: !isOn(c.name),
                onPress: () => toggle(c.name),
              }),
              Text({ dimColor: true, children: [c.mode === 'delayed' ? 'answer after ' + c.revealAfter + 's' : 'read only'] }),
            ],
          }),
          ...c.inputs.map((inp) =>
            Select({
              key: `input-${c.name}-${inp.key}`,
              label: '    ' + inp.key,
              options: inp.options.map((o) => ({ value: o, label: o })),
              value: vals[inp.key],
              onSelect: (v: string) => setInput(c, inp.key, v),
            }),
          ),
        ],
      })
    })

    return Box({
      flexDirection: 'column',
      children: [
        Text({ bold: true, children: ['sidecard · pick categories'] }),
        Text({ children: [' '] }),
        ...(blocks.length ? blocks : [Text({ dimColor: true, children: ['No categories found.'] })]),
        Text({ children: [' '] }),
        Box({
          flexDirection: 'row',
          columnGap: 3,
          children: [
            Button({
              key: 'generate',
              label: 'generate with haiku: ' + (settings.generate ? 'on' : 'off'),
              hotkey: 'g',
              onPress: async () => {
                settings.generate = !settings.generate
                redraw()
                await save($)
                if (settings.generate) refillAll($)
              },
            }),
            Button({
              key: 'now',
              label: 'show a card now',
              hotkey: 'n',
              onPress: async () => {
                await $.ui.close({ id: PANE })
                await showNow($)
              },
            }),
          ],
        }),
        Text({ dimColor: true, children: ['Add a category: drop a .md file in ~/.claude/sidecard/categories (or git clone a repo of them there).'] }),
      ],
    })
  })
}
