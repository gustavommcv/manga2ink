# ADR 0079: A note is one grey and one size, and a field is one component

- Status: Accepted
- Date: 2026-10-19
- Relates to: [ADR 0076](0076-the-edge-of-a-control-is-told-from-what-it-is-on.md) (the edge of the control of a field), [ADR 0071](0071-a-checkbox-is-on-the-line-of-its-title-and-in-line-with-the-control-beside-it.md) (the line of a label)

## Context

The small grey text under a title, a choice or a button, what a step uses, what a field is for, why a button cannot be pressed, was written by hand in 56 paragraphs and 16 other elements, and it was not the same text twice. It was in one of **two greys** (`muted-foreground` and a dimmer `subtle-foreground`, which the same list used for the tool of a step and the reason under it) and at one of **two heights of line**: 16 px by default and 19.5 px where someone had added `leading-relaxed` (19 times). The dimmer grey was 5.1 to 5.9 to 1 on the page, the other 7.1 to 7.6: two tiers with no rule for which was which.

A label above a control and a line under it was drawn by hand in 15 places (the three kinds of field of the options page, Device and Format in the queue's panel, the language and the theme, the parallel conversions, the three fields of the book details and the four selects of the volume editor), with 8 px between them in thirteen and 6 px in the panel, and the same `SettingFieldHeader` and `FieldMessage` wired the same way in each.

The panel of the queue had its own rhythm: "Steps" in the size of a note while "Device" and "Format" under it were in the size of a label; the row "Advanced conversion options" was 21 px under its line and 40 px above the next one; the line that says why nothing runs was at the left under buttons that are centered.

## Decision

- **`Note` (`components/shared/note.tsx`) is the small text under what it is about:** `text-xs`, `text-muted-foreground`, `leading-normal` (18 px). A note that is several lines of its own (a paragraph and a list) is `<Note as="div">`. The 56 paragraphs are notes; the error under a field is a note in the failed color.
- **There is one grey: `--subtle-foreground` is gone,** from both themes, the stylesheet, the palette story and the contrast test. The placeholder of a field, the detail under the name of a row, the hint of the drop area and the version in the title bar are `muted-foreground`, which is 7.1 to 7.6 to 1 on the page and a surface in both themes.
- **`Field` (`components/shared/field.tsx`) is a label above a control and what it is for under it:** 8 px between the three, a `SettingFieldHeader` when it has a way to put the choice back and a label when it has not, and the line under it is `${id}-message` for the control to name in `aria-describedby`. `announces` makes that line a live region, for a failure to keep a choice. `SettingFieldHeader` moved to `shared/` with it.
- **The panel has one rhythm:** "Steps" is in the size of a label, as "Device" and "Format" are; the row "Advanced conversion options" is framed by its line and the next with 10 px on each side of its text; the line that says why nothing runs is centered under the buttons. The warning about room keeps its icon and the left.

## Consequences

- A note looks the same wherever it is, and one change to it is one change.
- A field of a form is written once: the control, and what it is for.
- The details under the names of rows, the placeholders and the hint of the drop area are a little brighter than they were (5.1 to 1 is now 7.1 to 1); the description under a choice is 18 px high where it was 16 or 19.5.
- The contrast test of the themes loses one text color.
