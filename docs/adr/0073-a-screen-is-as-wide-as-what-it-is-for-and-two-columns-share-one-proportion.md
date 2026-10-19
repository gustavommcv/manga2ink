# ADR 0073: A screen is as wide as what it is for, and two columns share one proportion

- Status: Accepted
- Date: 2026-10-19
- Relates to: [ADR 0072](0072-a-screen-starts-with-one-header.md) (the top of the screen this one gives a width and a space)

## Context

Each screen chose its own width and the space between what it is made of, with the container of the page (`max-w-6xl`) around all of them. Measured, a title began at 32 px on the queue, the results and the volume editor, at 206 px on the library and the details of a book (a column of 768 px, centered), at 78 px on both pages of options (1024 px, centered) and at 302 px while converting (576 px, centered). Going from the queue to the options and back, the title moved. The space between the blocks of a screen was 20 px on two of them and 24 px on the rest.

The queue and the results both put a card beside what they are about, and divided the width differently: 1.6 to 1 and 1.5 to 1, so the card began at 728 px on one and 711 px on the other. The results put "Convert more" at the end of the column of the books when the card was there and at the end of the page when it was not, so the same button was at 561 px or at 1022 px.

## Decision

- **A screen has one of three widths, by name (`Screen`, `components/shared/screen.tsx`):** `wide`, the whole of the page, for a screen that sets things beside each other (the queue, the options, the volume editor, the results); `form`, a column of 768 px, centered, to read and fill in (the library, the details of a book); `status`, a column of 576 px, centered, that says one thing (while converting). The section is named by its title, and the blocks of a screen are 24 px apart on every one of them.
- **The pages of options are `wide`,** so their title begins where the queue's does. Their cards are as wide as the page.
- **A card beside what a screen is about is `TwoColumns` (`components/shared/two-columns.tsx`),** on one proportion, 1.6 to 1, for the queue and the results. Below the width where they cannot sit side by side, and when there is no card, they are one column.
- **The results have their header across the page,** with "Convert more" at its end whatever else is there; the books and the card beside them are under it.

## Consequences

- A title begins at the same place on the screens of one kind, and a change of width is made in one place.
- On the results the card begins where the queue's does, but lower: under the header, where it began beside the title.
- The pages of options use the width of the window, so a line of choices is longer on a large window than it was.
