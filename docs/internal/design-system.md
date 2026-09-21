# Design system

Barista's interface takes its cues from Apple's platforms: generous rounding,
layered translucent surfaces, restrained colour, type that breathes, and motion
with real physics. The goal is a tool that feels calm to use for an hour, not
one that shows off in the first ten seconds.

This page is the source of truth for the tokens. Components consume them; they
do not invent values.

---

## Principles

**Content first, chrome last.** The diagram is the product. Every pixel of UI
around it has to justify its existence. When in doubt, remove it.

**Motion clarifies, never decorates.** An element animates to show _what
changed_ — a node sliding to its new position after a re-layout, a panel easing
in from the edge it belongs to. Movement that carries no information is the
fastest way to make a tool feel cheap.

**Depth through light, not lines.** Surfaces separate with soft shadow and
translucency rather than hard borders. Borders appear where they carry
meaning — a selected node, a focus ring.

**Every interaction gets acknowledged.** Hover, press and focus all produce a
visible, immediate response. An element that does nothing when touched feels
broken even when it works.

---

## Colour

Neutral structure with a single warm accent. The accent is espresso-adjacent,
which is on-brand without being a joke about it.

```css
:root {
  /* Surfaces — light */
  --surface-base: #f7f7f5; /* app background, faintly warm */
  --surface-raised: #ffffff; /* cards, panels */
  --surface-overlay: rgb(255 255 255 / 0.72); /* + backdrop-blur */
  --surface-sunken: #eeeeec; /* wells, code blocks */

  /* Text */
  --text-primary: #1c1c1e;
  --text-secondary: #6b6b70;
  --text-tertiary: #9a9aa0;

  /* Accent */
  --accent: #c2703d; /* espresso */
  --accent-hover: #a85d2f;
  --accent-subtle: rgb(194 112 61 / 0.1);

  /* Feedback */
  --danger: #d1443c;
  --warning: #d68a1e;
  --success: #3a9a5c;

  /* Lines */
  --border-subtle: rgb(0 0 0 / 0.07);
  --border-strong: rgb(0 0 0 / 0.14);
  --focus-ring: #3d7dc2;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --surface-base: #151517;
    --surface-raised: #1e1e21;
    --surface-overlay: rgb(30 30 33 / 0.72);
    --surface-sunken: #0f0f11;
    --text-primary: #f2f2f4;
    --text-secondary: #a0a0a6;
    --text-tertiary: #6e6e75;
    --accent: #e08a52;
    --accent-hover: #ee9a63;
    --accent-subtle: rgb(224 138 82 / 0.14);
    --border-subtle: rgb(255 255 255 / 0.08);
    --border-strong: rgb(255 255 255 / 0.16);
  }
}
```

### Relationship colours

UML relationship kinds are distinguished **primarily by arrowhead shape**, as
the specification intends — hollow triangle for generalization, filled diamond
for composition, and so on. Colour is secondary reinforcement only.

This ordering is deliberate and it is what makes the diagram accessible:
someone who cannot distinguish two of these hues still reads the diagram
correctly, because shape carries the meaning. **Never introduce a relationship
distinction that exists only in colour.**

| Kind           | Stroke             | Line   | Arrowhead       |
| -------------- | ------------------ | ------ | --------------- |
| Generalization | `--text-primary`   | solid  | hollow triangle |
| Realization    | `--text-primary`   | dashed | hollow triangle |
| Composition    | `--accent`         | solid  | filled diamond  |
| Aggregation    | `--accent`         | solid  | hollow diamond  |
| Association    | `--text-secondary` | solid  | open arrow      |
| Dependency     | `--text-tertiary`  | dashed | open arrow      |

---

## Type

System fonts. On Apple platforms this resolves to SF Pro, which is exactly the
target; elsewhere it resolves to the platform's own well-tuned UI face. No web
font download, no layout shift.

```css
--font-ui:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
```

Class names, field signatures and code excerpts use `--font-mono` — they are
code, and monospace is how code is read.

| Token         | Size / line-height | Weight | Used for                    |
| ------------- | ------------------ | ------ | --------------------------- |
| `--text-xs`   | 11px / 16px        | 500    | Multiplicity labels, badges |
| `--text-sm`   | 13px / 18px        | 400    | Field and method rows       |
| `--text-base` | 15px / 22px        | 400    | Body, panels                |
| `--text-lg`   | 17px / 24px        | 600    | Class names in nodes        |
| `--text-xl`   | 22px / 28px        | 600    | Panel titles                |
| `--text-2xl`  | 28px / 34px        | 700    | Empty-state headline        |

Tighten letter-spacing slightly (`-0.01em`) at `--text-xl` and above; large
system type is drawn a touch loose for UI use.

---

## Space, radius, elevation

A 4px base scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Nothing in between —
consistent rhythm is most of what makes a layout feel deliberate.

```css
--radius-sm: 8px; /* badges, small controls */
--radius-md: 12px; /* buttons, inputs */
--radius-lg: 16px; /* diagram nodes, cards */
--radius-xl: 24px; /* panels, modals */
--radius-full: 9999px; /* pills, avatars */
```

Elevation is soft and layered — two shadows, a tight contact shadow plus a
wide diffuse one. A single hard shadow reads as a 2010 web app.

```css
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06);
--shadow-md: 0 2px 4px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.08);
--shadow-lg: 0 4px 8px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.12);
--shadow-xl: 0 8px 16px rgb(0 0 0 / 0.06), 0 24px 64px rgb(0 0 0 / 0.16);
```

Translucent surfaces pair `--surface-overlay` with `backdrop-filter: blur(20px)
saturate(180%)`. The saturation boost is what makes iOS blur look alive rather
than grey — without it, translucency just washes out whatever is behind it.

---

## Motion

Springs, not eased curves. These values were measured, not guessed: a target of
300 overshoots to ~306 and settles in roughly 800 ms — present, but not a
bounce anyone would describe as bouncy.

```ts
import { animate } from 'motion';

export const SPRING_DEFAULT = { type: 'spring', visualDuration: 0.45, bounce: 0.22 } as const;
export const SPRING_SNAPPY = { type: 'spring', visualDuration: 0.3, bounce: 0.15 } as const;
export const SPRING_GENTLE = { type: 'spring', visualDuration: 0.6, bounce: 0.1 } as const;
```

| Situation                       | Spring    |
| ------------------------------- | --------- |
| Node moving to a new layout     | `DEFAULT` |
| Panel entering or leaving       | `DEFAULT` |
| Button press feedback           | `SNAPPY`  |
| Hover elevation change          | `SNAPPY`  |
| Large view transition, zoom-fit | `GENTLE`  |

Two implementation facts worth remembering, both verified:

- `motion` writes `style.transform`, **not** the SVG `transform` attribute.
  Animate the style property.
- `@angular/animations` is **deprecated** with removal announced for v23. Use
  the native `animate.enter` / `animate.leave` for enter/leave, and `motion`
  for animating to computed coordinates.

### Reduced motion

Non-negotiable. Under `prefers-reduced-motion: reduce`, transforms and
opacity changes become instant. State still changes visibly — only the travel
between states is removed.

```ts
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const spring = prefersReducedMotion ? { duration: 0 } : SPRING_DEFAULT;
```

---

## Diagram surface

The canvas is `--surface-base` with a faint dot grid (1px dots, 24px spacing,
`--border-subtle`) that makes pan and zoom legible without competing with the
content.

Nodes are `--surface-raised` at `--radius-lg` with `--shadow-md`, lifting to
`--shadow-lg` on hover and gaining a 2px `--accent` border when selected.
Internally each node is three bands: name, fields, methods — separated by
`--border-subtle` hairlines, in that order, matching UML convention.

Pan and zoom apply a single transform to the root `<g>`. Never transform nodes
individually for viewport changes — that is O(n) per frame for something that
should be O(1).

Edges route orthogonally through ELK's bend points, with a 6px rounded corner
at each turn. Sharp right angles read as a 1990s CASE tool; softening them is
most of what makes the diagram look modern.

### Export constraint

SVG in this app must stay export-clean: **no `foreignObject`**, styles inline
on elements rather than in a stylesheet, real `<text>` nodes. PNG export
rasterises the SVG through a canvas, and any of those three will silently break
it. This constraint is the reason we render SVG by hand instead of adopting a
diagram library.
