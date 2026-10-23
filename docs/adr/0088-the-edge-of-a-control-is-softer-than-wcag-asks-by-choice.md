# ADR 0088: The edge of a control is softer than WCAG asks, by choice

- Status: Accepted (superseded as to the value of the edge by [ADR 0090](0090-the-edge-of-a-control-is-the-hairline-again.md))
- Date: 2026-10-23
- Amends: [ADR 0076](0076-the-edge-of-a-control-is-told-from-what-it-is-on.md) (the value of the edge, and the least the test holds it to)

## Context

[ADR 0076](0076-the-edge-of-a-control-is-told-from-what-it-is-on.md) gave the box, the field and the select an edge of their own, at 3 to 1 against what they are on, because the hairline of the cards (1.2 to 1.4 to 1 in the dark theme) made an unchecked box look like a hole. It shipped in alpha.17.

The owner, seeing the app after it, found the edges harsher than they had been: a clear grey line round every box, field and select, in the dark theme above all. A comparison was made of the three edges (the hairline as it was up to alpha.16, a middle one, and the 3 to 1 one) on the page and on a card, in both themes, from Storybook's palette story with the edge put back by CSS, and the owner chose the middle one.

## Decision

- **`--control-border` is `oklch(0.44 0.012 286)` in the dark theme and `oklch(0.72 0.012 286)` in the light one.** Against the four grounds the test measures (the page, a raised surface, a row the pointer is over, the panel of the controls of a table) that is 2.14 to 2.41 to 1 in the dark theme and 2.23 to 2.44 to 1 in the light one, where the 3 to 1 edge was 3.0 to 3.4 and the hairline is 1.2 to 1.4 in the dark theme and 1.7 to 1.8 in the light one. It is softer than 0076's and still plainly firmer than the hairline: an unchecked box is an edge and not a hole.
- **The test of the themes holds it at 2.1 to 1** on those grounds, where it held 3 to 1. It cannot go back to the hairline without the test saying so, and it cannot be made softer than this one without changing the number there and this record.
- **What 0076 decided stays:** `Checkbox`, `Input` and `NativeSelect` use the token; the default color of an edge is in the base layer, so a checked box has its own fill as its edge, a focused field the ring, and the callouts the tint they were drawn with; the hairline is for what is not a control.

## Consequences

- **This is below what WCAG 1.4.11 (non-text contrast, level AA) asks, which is 3 to 1 for the part of a control that tells it.** It is the owner's choice, made for how the app looks, and it is said here and not hidden in the numbers. The axe check that every story runs does not measure the edge of a control, so what CONTRIBUTING says of it is as true as it was; and nothing in the README or the guide claims conformance with WCAG as a whole. What still tells a control besides its edge: its fill against the ground, its label, the check mark of a box, and the ring of a focused one.
- A person who needs the stronger edge has no way to ask for it. A higher-contrast option would be the place for it; it is not done.
- Every picture with a field, a select or an unchecked box changes again, a little: the visual baselines are redrawn by the Windows run.
- The two values keep the hue and chroma of 0076's (286, 0.012) and only move in lightness, so a theme that is added takes one value, tried against the same four grounds.
