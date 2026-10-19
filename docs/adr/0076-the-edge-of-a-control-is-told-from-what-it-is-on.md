# ADR 0076: The edge of a control is told from what it is on

- Status: Accepted
- Date: 2026-10-19
- Relates to: [ADR 0066](0066-the-look-of-the-app-is-a-theme-and-a-theme-is-a-block-of-tokens.md) (a theme is a block of tokens), [ADR 0067](0067-the-light-theme.md) (contrast held by a test)

## Context

A box, a field and a select are told from what they are on by their edge: their fill is the page's own color, a shade from the surface they sit on. The edge was the hairline (`--border`) that draws the cards, the rows and the dividers, and that is made to be quiet: 1.2 to 1.4 to 1 against what it is on in the dark theme, 1.7 to 1.8 in the light one. WCAG 1.4.11 asks 3 to 1 of the part of a control that tells it. Measured, an unchecked box in the dark theme was 1.28 to 1: in the queue panel, in the chapters of a volume and in the settings it looked like a hole, and a select or a field was told from its card by its text alone.

The text and the fills of the interface were measured by a test (ADR 0067); the edge of a control was not.

Making the edge a color of its own found why a change of it could not be seen: the stylesheet ended with `* { border-color: var(--border); }` outside every layer, and a rule outside the layers wins over all of Tailwind's utilities, whatever their specificity. So no utility that sets the color of an edge had ever had an effect: not `border-primary` of a checked box, not the amber and red of the callouts (`border-status-warning/40`, `border-status-failed/50`), not the ring of a focused field (`focus-visible:border-ring`).

## Decision

- **`--control-border` is the edge of a control, a color of each theme:** `oklch(0.52 0.012 286)` in the dark one and `oklch(0.64 0.012 286)` in the light one, the graphite of the neutrals (286) a little lighter in the dark theme and darker in the light one than the hairline. It is 3.0 to 3.4 to 1 in the dark theme and 3.0 to 3.3 to 1 in the light one against the page, a raised surface, a row the pointer is over (muted at half) and the panel of the controls of a table (muted at 30%). The first value tried for the dark theme, 0.51, was 2.9 to 1 on the row under the pointer, and the test said so.
- **Used by the three primitives that draw a control:** `Checkbox`, `Input` and `NativeSelect`. A checked box keeps the primary color as its edge, a focused field the ring. The hairline stays for what is not a control: cards, rows, dividers, the dialog, the menu and the outline button, whose label tells it.
- **The default color of an edge is in the base layer** (`@layer base { * { border-color: var(--border) } }`), where it is the default that a utility can change. The utilities that had no effect now have: the callouts have the amber or the red of their own tint at 40 to 50% on their edge, as they were drawn to, a checked box an edge of its own fill, and a focused field the ring on its edge as well as around it. A test holds the rule in the layer.
- **A test holds it:** the unit test of the themes measures `--control-border` against each of those grounds, in each theme, at the least 3 to 1. The palette story shows a box, a field and a select on each ground, in each theme.

## Consequences

- An unchecked box and an empty field are seen on every screen, in both themes, and a person finds the controls of a form without reading it.
- Every picture with a field, a select or an unchecked box changes, a little: the edge is a clear line where it was nearly the color of the card. So does every picture with a callout: its edge has the tint it was given.
- A new control that is drawn with the hairline would not be read as an edge; it uses the primitives, which use the token.
