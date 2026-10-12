# ADR 0046: An item of the queue can have conversion options of its own

- Status: Accepted
- Date: 2026-10-11
- Relates to: [ADR 0014](0014-persisted-settings-and-reset.md) (what is kept between sessions), [ADR 0030](0030-title-author-and-language-belong-to-each-book.md) (what is typed for one item)

## Context

The conversion options (device, format and every mangapress option) belonged to the whole queue: one set, kept between sessions, for every folder, CBZ and manga of a library in a run. Someone converting a webtoon and a volume of manga, or a Kindle's books and one for a Kobo, had to run the queue twice and change the options in between.

What already worked per item points at the shape: a run sends one command per folder or CBZ with its own `settings` and `format`, and a library takes what was typed for each title by name (`titleDetails`).

## Decision

- **Each item can have options of its own**: a folder, a CBZ, and each manga of a library. A button on the item's row, and on each title of a library, opens the options page for that item only, titled "Options for <name>". It is the options page of the queue, not another editor, so there is one thing to learn.
- **Only the differences are kept.** The item holds the settings it changed, and the format if it changed it; the queue's options are what it follows for everything else. A later change to the queue's options reaches every option an item did not set. An option an item set back to the queue's value is no longer a difference, and an item with none follows the queue as before.
- **Not kept between sessions.** The queue itself is not kept, and these belong to its items; the queue's options are still kept (ADR 0014). **Use the queue's options** on the page drops what an item set.
- **One book per series stays a choice of the whole queue** ([ADR 0024](0024-combine-into-one-volume-is-epub-only.md)): under it every item keeps the queue's format, EPUB, and the page says so. The process steps are also the queue's: the button is not shown when mangapress is not run.
- **No change to the tools.** A folder or CBZ is sent with its effective options in its own command. A library's command carries `titleOptions` (title, settings, format) beside `titleDetails`; the application holds each title's options to the same rules as the library's before anything is bound, and a run that only joins ignores them.
- **The results say so**: the summary of a run adds how many items were converted with options of their own.

## Consequences

- A queue can hold items for different devices and formats, and one run makes them all.
- A validated plan is stale when an item's options change, as it is when its details do.
- Options of an item are not in the pending books list ("View books" after an interrupted run); reopening them shows the books, which are already made.
- Two layers of options can disagree with intuition at one point: choosing a device for an item resets its upscaling and color to what that device starts with, as it does for the queue, so those two may then differ from the queue's.
- Item options are not offered for the item's covers or details, which already live on the details page.
