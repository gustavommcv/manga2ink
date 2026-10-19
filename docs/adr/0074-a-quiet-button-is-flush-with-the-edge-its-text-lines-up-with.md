# ADR 0074: A quiet button is flush with the edge its text lines up with

- Status: Accepted
- Date: 2026-10-19
- Relates to: [ADR 0072](0072-a-screen-starts-with-one-header.md) (the way back is one of these), [ADR 0073](0073-a-screen-is-as-wide-as-what-it-is-for-and-two-columns-share-one-proportion.md) (the edges they line up with)

## Context

A quiet (ghost) button has no border or fill until the pointer is over it, so what a person sees of it is its text or its icon, and that sits inside the button by its padding: 16, 12 or 10 px. Put at the edge of a column, the text is that far in from the title or the list above it. Measured, the way back began 16 px in from the title it sits over (the chevron at 222 px where the title is at 206), "Select all" ended 12 px short of the "Unassigned" column it belongs to, the close of the settings ended 11 px short of the text below it, and "Clear" ended 11 px short of the list.

Four places had set this right by hand with `-ml-3`, which is right for a small button and wrong for a default one, and two of them (the reset in the queue's options and the one for an item) had copied it together with the four classes that dim a button that is `aria-disabled` and stays in place.

## Decision

- **`Button` has a `flush` edge: `start` or `end`.** Each size says how far in its text or icon is (`--inset`: 1rem, 0.75rem, 1.5rem, and 0.625rem for an icon, which is centered in its square), and `flush` sets that much of the button outside the edge, on that side (`-ml-(--inset)`, `-mr-(--inset)`). The text lines up; the hover reaches past, into the space around the column. The size and the edge are asked for, never worked out by the screen.
- **Used where a quiet button begins or ends a column:** the way back (`start`), the reset of the options and of an item (`start`), the details of a run and the links that are a name in a line of text (`start`), "Select all" and "Clear" (`end`) and the close of the settings (`end`).
- **A button that is `aria-disabled` is dimmed by the button itself:** it stays where it is and can be focused (the reset, when there is nothing to reset), and it does not change when the pointer is over it. The copies of those classes are gone.

## Consequences

- A quiet button that has to line up says so with one word, and the arithmetic of its padding is in one place.
- The hover of a flush button reaches 16, 12 or 10 px past the edge it lines up with, which is into the margin of the page and of the settings, and no further than that.
- A story measures the edges in a browser, so a change to the padding of a size that is not followed here fails it.
