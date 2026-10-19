# ADR 0077: A callout is one box, and its icon is on the first line

- Status: Accepted
- Date: 2026-10-19
- Relates to: [ADR 0076](0076-the-edge-of-a-control-is-told-from-what-it-is-on.md) (the tints and edges of a callout, which it made visible), [ADR 0072](0072-a-screen-starts-with-one-header.md) (the title of a screen is its own heading)

## Context

Ten places told a person something in a tinted box: the notices at launch, the banners of a mode (`InfoBanner`), the failure of a run, the startup error, the state of the tools, the answer to an action in the volume editor, the books that were not added, the options of items, and, on the results, one card for each book that was skipped or failed and one for each warning. Each drew the box itself, and the copies had drifted: the corner was `rounded-lg` in eight and `rounded-xl` in two, the padding `px-4 py-3` or `p-4`, the edge of a failure 40 or 50 per cent, the icon 16 or 20 px, the text of what it said 12 or 14 px with three line heights, and the title `font-semibold` or `font-medium`.

The icon was put on the first line by a nudge, `mt-0.5`, which is right for one size of icon and one size of text. Measured, it was 2.5 px below the middle of the first line on the results (a 20 px icon, `mt-0.5`, beside a title of 20 px) and 1.5 px below it in the warning about room, and 17 places carried a nudge like it.

## Decision

- **`Callout` (`components/shared/callout.tsx`) is the box.** One corner, one padding and one size of text, a title (a heading, of the first level on a page that has nothing else to say what it is), what it says in the muted color, what can be done about it (`action`) or putting it away (`dismiss`) at its end, and a `tone`: `warning` (amber), `failed` (red, 50 per cent on its edge), `override` (what one item sets over the queue's options) and `neutral` (a remark, nothing tinted). The icon is the caller's, as it says what the box is about, and its color is the tone's. `InfoBanner` is a callout with the info icon.
- **`IconLine` (`components/shared/icon-line.tsx`) is an icon on the first line of a text.** The box of the icon is `h-lh`, a line of the text it is at high, so the icon is centered on the first line whatever the size of the text and the number of lines, and nothing is nudged. It is also the line about room in the queue's panel.
- **The size of the text is set once on the box** (14 px), and the first line of what it says is of that size; a list of a few lines of its own is a `ul` in that size.
- **A story measures it:** the icon is on the middle of the first line of the title, and of the text when there is no title, in a browser, with a text of several lines; it fails when the box of the icon is not a line high.

## Consequences

- A warning, a failure and a remark look as one thing, and a change to what they look like is made once.
- The state of the tools is `neutral`, as the answer in the volume editor is: they were two boxes, one with a surface fill and one with a muted fill, and are now one.
- The text of the banners of a mode (`InfoBanner`) is 14 px where it was 12 px, as the cards of the results are; the lists of the notices and of the books not added too.
- 15 of the 17 nudges are gone; the two left are in rows of a list.
