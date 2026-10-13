# ADR 0049: The queue's options page says which items have options of their own

- Status: Accepted
- Date: 2026-10-13
- Relates to: [ADR 0046](0046-an-item-can-have-conversion-options-of-its-own.md) (what an item can set), [ADR 0047](0047-an-option-of-an-item-is-put-back-to-the-queues.md) (how one option is put back), [ADR 0014](0014-persisted-settings-and-reset.md) (what "Reset to defaults" puts back)

## Context

An item keeps only the options it changed and follows the queue for the rest (ADR 0046). What it set is shown on its own row and page, in color, and can be put back there. Nothing on the queue's own options page said that some items would not follow a change made there for the options they set, and the only way to put them all back was to open each item.

Two things looked like they might need to change with it: whether "Reset to defaults" on the queue's page should also drop what items set, and whether the app should remember an item's options by its path for the next session.

## Decision

- **The queue's options page says how many items are converted with options of their own**, counting inputs and titles of libraries one by one, with a single action, **Use the queue's options for all**, that puts every one of them back. It is not shown when there are none, and the answer ("2 items now follow the queue's options.") takes its place and holds the focus, so a keyboard is not left on something that vanished.
- **It is one click, as the same action on an item's page is.** What it drops is not kept between sessions either (ADR 0046), and an item's options can be set again from its row.
- **"Reset to defaults" is unchanged**: it puts back the queue's own options, the device, the format and every mangapress option, and leaves what items set. Dropping them as well would make one button on the queue's page undo choices made on other pages, and the new action says so in its own name.
- **Options of an item are still not remembered by its path.** They would be state no one can see: an item would have options that were forgotten, with no place to find or clear them, and a path that moved or was renamed would lose them without a word. A person who wants the same choices for several items has the options of the queue, and a preset (not built) is the explicit form of remembering.
- **The options button stays on the rows that are not recognized.** Hiding it would leave options an item already has with no button to see or clear them when its row turns into one that cannot run, and what it saves is one click.

## Consequences

- The page where a person changes the queue's options is also where they learn that some items will not follow, and can make them follow.
- A queue of many items with options of their own is put back in one step instead of one by one.
- The notice counts what is set, not what a run would use: when mangapress is not run (only joining) the options page is the same one and the count is the same, and the options are simply not applied (ADR 0046).
- There is still no list of which items are the ones: the colored button on each row is how to tell.
