# ADR 0090: The edge of a control is the hairline again

- Status: Accepted
- Date: 2026-10-23
- Amends: [ADR 0076](0076-the-edge-of-a-control-is-told-from-what-it-is-on.md) (the value of the edge) and [ADR 0088](0088-the-edge-of-a-control-is-softer-than-wcag-asks-by-choice.md) (the middle edge, and the least the test holds it to)

## Context

[ADR 0076](0076-the-edge-of-a-control-is-told-from-what-it-is-on.md) gave the box, the field and the select an edge at 3 to 1, and alpha.17 shipped it. The owner found it harsher than the app had been, and [ADR 0088](0088-the-edge-of-a-control-is-softer-than-wcag-asks-by-choice.md) softened it to 2.1 to 1 for alpha.18, after comparing three edges. After living with that one too, the owner decided that the soft look of the first theme, the dark one above all, was better, and that the strong edge should wait for a high-contrast theme, which is to be added later.

The reason for 0076 is still true and is the price of this decision: against the hairline an unchecked box in the dark theme is 1.28 to 1, an empty field and a select are told from their card by their text, and WCAG 1.4.11 (non-text contrast, level AA) asks 3 to 1 of the part of a control that tells it.

## Decision

- **`--control-border` is the hairline of the cards and the rows in both themes:** `oklch(0.299 0.009 286)` in the dark one and `oklch(0.8 0.01 286)` in the light one, the values of `--border`. The look is the one up to alpha.16.
- **It stays a token of its own, not a use of `--border`.** A theme is a block of tokens (ADR 0066), and a high-contrast theme is one more block, which gives this token the strong edge. The values that were measured are the starting point: `oklch(0.52 0.012 286)` in the dark theme and `oklch(0.64 0.012 286)` in the light one were 3.0 to 3.4 to 1 against the page, a raised surface, a row under the pointer and the panel of a table. `Checkbox`, `Input` and `NativeSelect` keep using the token.
- **The test of the themes holds the edge from going fainter than the hairline** on those four grounds, where it held 2.1 to 1 (0088) and 3 to 1 (0076). It cannot be a floor for WCAG while the themes have the soft edge; the floor that WCAG asks belongs to the high-contrast theme, with its own test.
- **What 0076 decided about the cascade stays,** since it was a fault and not a look: the default color of an edge is in the base layer, so a checked box has its own fill as its edge, a focused field the ring, and the callouts the amber or the red of their tint. Only the value of the edge of a control goes back.

## Consequences

- The default look is the soft one again, in both themes. An unchecked box is a faint line, as it was before alpha.17.
- The edge of a control is below what WCAG 1.4.11 asks, as it was in 0088, and it is below what 0088 had. Nothing in the README or the guide claims conformance with WCAG as a whole, and the axe check of the stories does not measure it. A person who needs the stronger edge has no way to ask for it until the high-contrast theme exists.
- Every picture with a box, a field or a select changes, a little, and the visual baselines are redrawn by the Windows run.
- The notes of the next alpha say that the edge is the soft one again.
