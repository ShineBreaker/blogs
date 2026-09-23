# DESIGN — ASCII Orbit

The site renders a terminal session, not a conventional web page: a fixed
command bar on top, a scrolling log of entries, and an ASCII globe spinning in
the corner. "Pixel" comes from the typeface (Departure Mono); "ASCII" comes
from every ornament being a character, never an image.

This document is the contract. Visual changes must stay inside the vocabulary
below; if a needed element has no vocabulary yet, extend this file first.

## Invariants

- `border-radius: 0` everywhere. e2e asserts it on `.toolbar-shell` and
  `.post-card`; rounded corners break the illusion.
- No shadows, blur, or decorative gradients on chrome. The globe's
  `mask-image` fades are functional (blending into the page), not decoration.
- No transitions or easing — state changes snap instantly, like a terminal.
  The only motion is the blinking cursor (`step-end`) and the globe's low-fps
  frame updates (12–18 fps, a deliberate flipbook cadence).
- Monospace only. Decorative marks are real characters; no emoji, no icon
  fonts, no SVG pictographs in the interface.
- Colors come only from palette tokens; hex values live exclusively inside the
  `[data-palette]` blocks in `main.css`.

## Typography

| Token | Face | Role |
| --- | --- | --- |
| `--font-ui` | Departure Mono UI (pixel, ASCII subset) | chrome, headings, numbers, status text |
| `--font-prose` | Sarasa Mono SC | post body, excerpts (CJK coverage) |
| `--font-code` | Sarasa Fixed SC | code blocks, inline verbatim |

Decorative glyphs must be ASCII or inside the Departure Mono `unicode-range`
declared in `main.css` (arrows `←` `→`, box drawing `U+2500–257F`). Anything
else silently falls back to another face and breaks cell metrics — pick an
ASCII substitute instead.

## Color

- Each palette declares the 16 Base16 slots `--base00`–`--base0F` plus
  `--signature`, the scheme's signature accent (active-palette indicator).
- Components consume semantic tokens only: `--ink`, `--ink-muted`,
  `--surface`, `--surface-raised`, `--line`, `--line-strong`, `--link`,
  `--focus`, `--signature`.
- Terminal bold = bright: `<strong>` in prose renders in `--base06`, mirroring
  how terminals map bold to the bright ink variant.
- Syntax highlighting uses the hljs → Base16 mapping in `main.css`; every
  palette re-themes code blocks for free.
- `--focus` must keep ≥3:1 contrast against `--surface`; the light palette
  overrides it to `base08` for that reason. `::selection` text must stay
  readable on the `base0D` wash in every palette.

## Line vocabulary

| Line | Meaning |
| --- | --- |
| `1px dashed --line` | content separators — card rows, list rows, `hr`, footer top edge, pagination cells |
| `1px dashed --line-strong` | stronger separators — section tops, code/quote surrounds |
| `3px double --line-strong` | window chrome — toolbar shell, palette menu, media dialog (DOS frame motif) |
| `2px solid` accent rail | semantic gutters: `pre` = `--base0C` (program output) |
| `1px dashed` inline | verbatim `code` chip |
| `1px dashed --line-strong` | image frame in post content |
| `2px dashed --focus` outline | `:focus-visible` (terminal marquee) |

`double` collapses to a solid line at 1px widths, which is what mobile chrome
relies on. Quotes are marked by `>` gutter glyphs instead of a rail — the
markdown-native rendering.

## Glyph vocabulary

ASCII-only furniture; all of it lives in `::before`/`::after` or
`aria-hidden` spans so it never reaches the accessibility tree:

- `$ ` — prompt prefix on eyebrows (`journalctl --follow`, `ls -lt`, `rg …`)
- `_` — blinking cursor on the live input (search box)
- `> ` → `>> ` — link affordance, doubles on hover
- `|` — left rail tick on log entries (post cards)
- `|--` — tree branch on taxonomy rows
- `-rw-r--r--` — file permissions before archive rows
- `[ … ]` — commands and status chips: `[LOG]` `[MATCH]` `[READY]` `[ EOF ]`
  `[ READ ]` `[ PREV ]` `[ NEXT ]` `[ ATOM ]` `[||]` `[>]` `[/]` `[ EAGMORE ]`
- `# ` / `## ` / `### ` / `#### ` — heading depth markers (page `h1`, then
  `h2`–`h4` in prose)
- `#` — hover-revealed permalink marker at the right edge of prose headings
- `#tag` — tags; `// ` — separators inside meta lines
- `<` `>` — arrows flanking the post `h1`
- Globe glyphs are fixed: ocean `~`, land `#`, coast `@`/`*`; `|` and `+` are
  forbidden (e2e-enforced)

## Surfaces

- **Toolbar** — a floating console window (double frame), fixed above content.
- **Cards/rows** — log entries: rails and dashed rules, never boxed cards.
- **Post sheet** — a centered column floating over the article globe, which is
  masked to clear the reading lane.
- **Code blocks / quote gutter** — program output is a raised panel with an
  accent rail; quotes get `>` markers in a hanging gutter.
- **Dialogs/menus** — same double frame as the toolbar.

## Accessibility floor

- Skip link, landmarks, exactly one `h1` per page; decorative glyphs are
  pseudo-element or `aria-hidden` content.
- `prefers-reduced-motion`: cursor blink stops, globe renders a static frame.
- `forced-colors`: globe hidden, chrome borders fall back to `CanvasText`.
- Focus stays a visible 2px outline in every palette — never trade the focus
  indicator away for style.
