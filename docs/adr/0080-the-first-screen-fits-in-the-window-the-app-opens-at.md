# ADR 0080: The first screen fits in the window the app opens at

- Status: Accepted
- Date: 2026-10-19
- Relates to: [ADR 0062](0062-the-window-opens-as-it-was-left.md) (the size it opens at), [ADR 0073](0073-a-screen-is-as-wide-as-what-it-is-for-and-two-columns-share-one-proportion.md) (the two columns the queue is made of)

## Context

The app opens at 1180 by 760 px, and under its 48 px title bar the page has 711 px. Measured in the packaged app, the first screen, the queue with nothing in it, was 721 px tall when the audit of the interface began: 10 px more than the window, so it opened with a scroll bar to go 10 px down. The changes of the audit that came before this one (the panel's notes and rows) took it to 712 px, still 1 px over in English, and 694 px in Portuguese, whose texts are shorter. The panel beside the queue (the steps, the choice of device and format, the buttons) is the tallest part of it, 632 px, and the page put 40 px of space over it and 40 under, which two screens wrote each for themselves: the one of the app and the one that says it could not start.

The window of a person with a screen of 1366 by 768 px is as tall as the work area leaves it, about 730 px with a bar, so the margin that matters is not the one at 760.

## Decision

- **`Page` (`components/shell/page.tsx`) is the area under the title bar,** the one that scrolls, with the page in it, 72 rem wide at most and 32 px from the sides and from the bar. The app and the screen that says it could not start use it, and the space over and under the page is 32 px where it was 40.
- **The panel of the queue is 16 px between its parts, where it was 20,** which, with the other 16 px, makes the first screen 676 px tall in English and 658 px in Portuguese: it fits in 711 px with 35 px to spare, and in 681 px, the window of a laptop with a bar, with 5.
- **A packaged test holds it:** it measures the height the first screen needs, the title bar and the page, with the queue and its panel side by side, and says it is no more than the 760 px the window opens at (`tests/e2e/first-screen.e2e.ts`). It measures what the screen needs, not the window of the run: the window of a runner cannot always be as tall as a person's. I checked that it fails, at 788 px, with 64 px over and under the page.

## Consequences

- The app opens with nothing to scroll in either language, and on a laptop screen with a bar.
- The screens that are taller than the window, a long list, the options page, still scroll, as they should; they have 16 px less above and below.
- A change to the page's padding, or to the panel, that makes the first screen taller than the window fails a test instead of showing in a person's window.
