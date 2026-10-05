# sidecard

**English** · [简体中文](README_zhs.md) · [繁體中文](README_zht.md)

A Claude Code **mod** that turns the wait while your agent works into tiny, disposable learning cards. It draws a boxed card under the spinner, and removes it the moment Claude needs you or finishes.

```
⠋ Thinking…
╭─ sidecard · french ───────────────╮
│ pourtant                          │
│ however / yet                     │
│                                   │
│ Il était fatigué, pourtant il a … │
│ ┄ answer in 4s ▰▰▱▱▱▱             │
╰───────────────────────────────────╯
```

Cards are either **read-only** or **delayed-answer** (a countdown, then the answer).

## Requirements

- Claude Code **v2.1.287 or later** (mods). Check with `claude --version`.
- Cards draw in the terminal and the Desktop app's Code tab only (not the VS Code chat panel or `claude -p`).

## Install

```text
/plugin marketplace add phunterlau/sidecard
/plugin install sidecard@sidecard
/reload-plugins
```

Confirm it loaded: `/plugin` shows `1 mod active · sidecard`. A mod is code that runs with your permissions; read `hooks/register.ts` first. `claude plugin validate .` lists every event it hooks and every call it makes.

## Use

| Command | Effect |
| --- | --- |
| `/sidecard` or `/sidecard menu` | Category menu: `✓`/`☐` toggles (hotkeys 1–9) and a dropdown for each category's inputs |
| `/sidecard now` | Show a card right away (in the spinner during a turn, above the prompt when idle) |
| `/sidecard review [n]` | List the last `n` cards shown (default 10), newest first, with answers and how well you likely remember each |
| `/sidecard on` / `off` | Enable or disable all cards |
| `/sidecard <category>` | Toggle a category, e.g. `/sidecard french` |
| `/sidecard <category> key=value` | Set an input, e.g. `/sidecard french level=B1` |
| `/sidecard generate on\|off` | Fresh cards from Claude Code's Haiku, on or off |
| `/sidecard reload` | Rescan category files |
| `/sidecard status` | Show current settings |

Defaults: a card appears 8 seconds into a turn, stays 20 seconds (longer for delayed answers), with at least 45 seconds between cards. It disappears when the turn ends or when Claude asks for permission or input. Settings persist across sessions.

### Review and the forgetting curve

Every card shown is remembered, with when, across sessions. `/sidecard review` lists the most recent ones, so a card you only half-read is not lost:

```text
2. french · 2d ago · seen 2× · memory 50%
   manquer à
   to be missed by
```

Cards marked **high value** (bundled gotchas and recall prompts; Haiku rates a few of the generated ones) can come back. The estimated memory of a card is `exp(-time since last shown / stability)`, where stability starts at one day and grows each time the card is shown again, more when the repeat comes just as it was fading and hardly at all when it comes straight away. Once a high-value card drops below 50%, a card slot has a 30% chance of being that card instead of a new one. Low-value cards never come back, and nothing needs an answer: it is time-based only.

### Where cards come from

- **Generated**: the mod asks Claude Code's own `haiku` (`$.model.complete`, low effort) for batches of 10 cards in the background, caches them, and avoids repeats. No separate API key is needed, but it **spends your plan or API quota**. Turn it off with `/sidecard generate off`.
- **Bundled**: 58 offline cards cover `french`, `python-advanced`, `ml-general` and `llm`, used before the first batch arrives or when generation is off.

### Example cards

Three of the bundled cards, as they look under the spinner: a delayed-answer card after its answer arrives, one mid-countdown, and a read-only card.

```text
╭─ sidecard · python-advanced ────────────────────────╮
│ class A: ...                                        │
│ class B(A): ...   class C(A): ...                   │
│ class D(B, C): ...                                  │
│                                                     │
│ D.__mro__ order?                                    │
│ Think for a moment…                                 │
├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤
│ D, B, C, A, object                                  │
│ C3: a class precedes its bases; base order is kept. │
╰─────────────────────────────────────────────────────╯

╭─ sidecard · llm ──────────────╮
│ Why is FlashAttention faster? │
│                               │
│ Think for a moment…           │
│ ┄ answer in 3s ▰▰▰▱▱▱         │
╰───────────────────────────────╯

╭─ sidecard · llm ──────────────────────────────╮
│ Grouped-query attention                       │
│ Several query heads share one key/value head: │
│ smaller KV cache, faster decoding.            │
╰───────────────────────────────────────────────╯
```

The `python-advanced` set covers method resolution order, mutable dataclass defaults, `@contextmanager` cleanup, `Protocol` and the GIL, next to the classic gotchas (shared lists, mutable default arguments, late-binding closures). The `llm` set covers sampling (temperature, top-p), attention cost, FlashAttention, grouped-query attention, the KV cache, LoRA, RAG and DPO.

## Categories and development

Cards come from **categories**, and each category is one markdown file. Bundled ones live in `categories/`: `french`, `python-advanced`, `ml-general`, `llm`.

A new category appears automatically when its file shows up in either folder, including one level of subfolders, so you can `git clone` a category pack there:

- `categories/` in this plugin
- `~/.claude/sidecard/categories/`

Files are picked up at session start, when you open the menu, and on `/sidecard reload`.

```markdown
---
name: french                 # required: lowercase letters, digits, - or _
title: French                # menu label
color: cyan                  # cyan|green|magenta|yellow|blue|red|white
mode: delayed                # read | delayed
revealAfter: 6               # seconds until the answer (delayed only)
model: haiku
input.level: A2 | A1, A2, B1, B2, C1, C2   # <default> | <options>
---
Teach practical French for a learner at CEFR level {{level}}.
Each card is a phrase with an example, or a recall prompt with the answer in "answer".
```

- `input.<key>: <default> | <options>` adds a dropdown in the menu. Every input needs a default.
- `{{key}}` in the body is replaced by the chosen value (or the default).
- The mod asks the model for a JSON array of `{"body", "answer"?}`; you only write the teaching instructions.
- A category with no bundled fallback cards needs generation on.

### Contributing

Contributions are welcome, especially new categories and better cards:

- **Add a category**: copy a file in `categories/`, change the frontmatter and the teaching prompt, and open a pull request. Good candidates are other languages, SQL, shell, system design, algorithms, math, or your own field.
- **Add or improve offline cards**: the bundled fallbacks in `hooks/cards.ts` are used before the first generated batch arrives and when generation is off.
- **Improve the mod**: card layout is in `hooks/draw.ts`, the category parser in `hooks/frontmatter.ts`, history and the forgetting curve in `hooks/memory.ts`, and the hooks, commands and menu in `hooks/register.ts`.

Before opening a pull request, run these from a clone of the repo:

```bash
claude plugin validate .
claude plugin test .
claude --plugin-dir .      # loads the clone for one session and reloads hooks on save
```

Please add a test in `hooks/*.test.ts` for any parser or drawing change.

## License

MIT, see `LICENSE`.
