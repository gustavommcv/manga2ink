# ADR 0075: Every checkbox is a check row

- Status: Accepted
- Date: 2026-10-19
- Relates to: [ADR 0071](0071-a-checkbox-is-on-the-line-of-its-title-and-in-line-with-the-control-beside-it.md) (the rule, which it carries to every box)

## Context

ADR 0071 gave the steps of the queue and the choices of the options page one rule: the box is on the line of its title, and what a row says under it does not move the box. It left the rest alone, and measuring every box of the 181 stories said what that was: four more places drew a box and its words in a layout of their own.

- The settings (Processing, two boxes, and Updates, one) put the box at the top of a block whose title had a line of 14 px: the box was 4.5 px above the middle of the title.
- The "one book for the series" of the queue's panel was a copy of the choices of the options page that did not use it, and nudged its box with `mt-0.5`.
- The chapters of a volume centered the box on the two lines of the name and the pages: 9.5 px under the title.

So the same box was in three places in relation to its words, depending on the screen, and each of the five wrote its own `Checkbox` with the same `aria-describedby`, label and `onCheckedChange` that turned the answer into a boolean.

## Decision

- **Every box with words is a `CheckRow`** (`components/shared/check-row.tsx`, moved from `settings/`). It draws the box itself, so it takes the state (`checked`, `onChange(checked)`, `disabled`, `id`, `describedBy`) and not the box. A title that is a text is made the label of the box; a title that is more than that (a name with its reset button) is given as it is, with the size of a label so that its line is the label's. What is under the row is the `note`, in line with the title. A box whose title is not a label of its own takes `aria-label`.
- **Used by** the steps, the choices of the options page, the single book of the panel, the two choices of the Processing tab, the automatic check of the Updates tab (a box that cannot yet be changed), and the chapters of a volume, where the pages are the note.
- **The chapters of a volume follow the rule of the title line,** as a person who looks for one in a list does, instead of the middle of two lines: the rule is one for the whole app.
- **A story measures it:** the box of a row is on the line of its title in a browser, with a long note and when the box is disabled.

## Consequences

- There is one way to put a checkbox in the app, and a new one gets the rule by using it; the 55 boxes of the stories are on the line of their titles to half a pixel.
- A long name of a chapter now wraps, where it was cut at the end of the line.
- The text under a title is still written by each caller, in its own size and colour; that is for a change of its own.
