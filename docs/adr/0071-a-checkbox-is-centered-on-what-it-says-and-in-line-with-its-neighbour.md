# ADR 0071: A checkbox is centered on what it says, and in line with the control beside it

- Status: Accepted
- Date: 2026-10-18
- Relates to: [ADR 0002](0002-shadcn-radix-tailwind-design-system.md) (the design tokens), [ADR 0046](0046-an-item-can-have-conversion-options-of-its-own.md) (the options page, also of one item)

## Context

Two things looked off in the interface, and measuring the built Storybook (a headless Chromium, 1×) said why:

- **The steps of the queue.** The box sat by the first line: its middle was 11px above the middle of the title and the tool under it (a 42px block), and 2.5px above the middle of its own title.
- **The options page.** In a row of two columns, a choice (a checkbox with a description) was drawn in another rhythm than the field beside it, a label over a control of 36px over a hint: "Manga reading order" was 2px above "Content", its box 4.5px above it, and nothing on its side was in line with the select.

Three causes, in the code and not in taste:

1. **A line of 24px under a label of 20px.** The header of a field is a `div` that took the page's size (16px, a line of 24px) while its label is 14px with a line of 20px. The label sat in the middle of a taller line, 2 to 3px from the top of its own container, and the offsets that put the box where the text was (`mt-0.5` in the steps, `-mt-0.5` in the options) were written for a line of 20px.
2. **Two ways to place the same thing.** The steps (`items-start`, `mt-0.5`) and the choices of the options page (`flex`, `-mt-0.5`) each had their own, so they could differ and did.
3. **The box was tied to the first line,** which suits a title alone and not a title with a second line (the tool of a step), and a field whose control is lower than the title.

## Decision

- **The header of a field is set in the size of its label** (`text-sm`, a line of 20px), so the line is as high as the text and what is aligned to it starts where the text starts. Every field with a label is now 4px lower in its label row, which tightens the options page, the queue's options and the options of an item a little, and puts the reset button of a field on the line of its label (it was 2px under).
- **One component for a checkbox with its words, `CheckRow`,** used by the steps and by the choices of the options page. The box is centered on the title and on what belongs to the title under it (the tool of a step): the pair, not the first line. What is said about the box (a description, or why it cannot be changed) is under the row, in line with the title (28px: the box and the gap), and does not move the box.
- **A choice beside a field with a label is in line with that field's control.** In two columns, `CheckRow` leaves a slot as high as a label (20px and the gap) over the row and makes the row as high as a control (36px, `sm:min-h-9`), so the box and the title are centered on the control beside them, and the description is under it where the hint of the field is. Which choices are beside such a field is worked out by the section (`besideTheirFields`): the fields of a section are two to a row, in order, and none spans two columns; a choice beside a field that is not a choice is in line with it, and one beside another choice, or alone in its row, is not moved (two choices side by side are in line with each other by themselves, and a slot would only leave a gap above them). In one column there is no neighbour: the slot is hidden and the choice is by its title.
- **Measured, not looked at.** The stories (`test:stories`, in a real browser) check the numbers: the middle of the box against the middle of the title and the tool, against the middle of the select beside it, the top of the description against the top of the hint, the reset button against the box, a locked choice, a locked step with its reason, and the same in Portuguese. A test breaks them on purpose (box by the first line) and the stories fail.

## Consequences

- The box of a step is within half a pixel of the middle of its title and its tool; the box and the title of a choice are on the line of the control beside it and its description on the line of the field's hint (0 to 0.5px measured, wide and in Portuguese).
- The visual baselines that show a field or a step change, by a few pixels and by a line of text up or down. The pictures of the guide are made again by the build.
- Choices elsewhere (the checkboxes of the Processing and Updates tabs, of the mapping editor and of the queue) are as they were: they have their own surroundings, and `CheckRow` is what to use for the next one in a form.
- A longer title that wraps takes the box to the middle of its lines, and a choice with a wrapped title beside a field is taller than the control and takes its description down with it; the row is not forced to 36px.
