# ADR 0078: A row is one component, and the places of its buttons are fixed

- Status: Accepted
- Date: 2026-10-19
- Relates to: [ADR 0077](0077-a-callout-is-one-box-and-its-icon-is-on-the-first-line.md) (the icon of a row is not a callout's: it is a tile), [ADR 0073](0073-a-screen-is-as-wide-as-what-it-is-for-and-two-columns-share-one-proportion.md) (the width the rows are in)

## Context

Three lists of the app drew a row by hand, and each was the same row: a tile of 36 px with an icon, a name with what is known of it under, the state of the thing in a pill, and its buttons: the items of the queue, the titles of a library, the books that are ready. A fourth, the options of the metadata source, drew the same tile with a letter. Five places drew a pill (the state of an item, of a title, how many are in the queue, where a mapping began, that the books are being shared), with the same classes except that two had `px-2` and one had a border.

The rows had not the same buttons, and only one of the three knew it. The titles of a library left a place for a button a title did not have, and the state of every title ended in one column. The queue did not: a row that is read has no button for its volumes, one that is being checked has only the one to remove it, and the state of its rows ended at 491, 491, 538, 634 and 634 px. The books that are ready put their buttons at the end of the row, so "Save as…" was at one place for a book that was saved and at another for one that was not. Two rows had a nudge of their own for the text under the name (`mt-0.5`).

## Decision

- **`ListRow` (`components/shared/list-row.tsx`) is the row.** The tile, the name (cut at the end of the line, with what it is short for as its title), what is known of it, more that is worth saying, the state and the buttons. When the row is too narrow for all of it, the state and the buttons drop under the name.
- **The places of the buttons are fixed.** `actions` has an entry for each button that any row of the list can have, in the order they are drawn, and an entry that is `undefined` leaves the place empty (a square the size of a button). So the state and every button of every row of a list are in the same column, and a row that has fewer buttons has an empty place where the others have a button. The queue, the titles of a library and the books that are ready all do it.
- **`Badge` is the pill,** with the four tones a row has (`neutral`, `accent`, `warning`, `danger`, the tones of the state of a row in the domain). The mapping's one lost its border, and the count of the queue its half pixel of padding: one pill. **`IconTile` is the tile,** with an icon or a letter.
- **A story measures it:** in a list whose rows have not the same buttons, the state and the last button of every row end at the same place in a browser, and it fails when a place is not kept.

## Consequences

- The state of the rows of the queue is in a column. A row that has only the button to remove it has an empty space where the others have three buttons, as the titles of a library already did.
- A change to a row, or to a pill, is made once.
- The text under the name of a row is set apart by 4 px (`mt-1`), and no `mt-0.5` is left in the app.
