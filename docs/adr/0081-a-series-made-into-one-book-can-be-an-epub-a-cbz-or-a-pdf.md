# ADR 0081: A series made into one book can be an EPUB, a CBZ or a PDF

- Status: Accepted
- Date: 2026-10-20
- Replaces: the EPUB-only part of [ADR 0024](0024-combine-into-one-volume-is-epub-only.md) and the lock of the format in [ADR 0025](0025-single-book-mode-workflow-control.md) (its decision 3)
- Amends: [ADR 0045](0045-cbz-is-the-format-a-first-launch-starts-with.md) (it counts the whole series in one book among what favours EPUB)
- Relates to: [mangapress ADR 0025](https://github.com/gustavommcv/mangapress/blob/main/docs/adr/0025-a-cbz-keeps-its-chapters-in-the-folders-they-were-in.md)

## Context

ADR 0024 offered "Create one book for the series" for EPUB only. mangapress could give the book two levels of navigation, a volume and its chapters under it, only in an EPUB (`--nested-toc`), and refuses the flag for a CBZ or a PDF; the same ADR says that widening the offer later is one edit. ADR 0025 made the mode lock the format to EPUB while it is on, and turning it on switched the format to EPUB.

The person this app is made for reads in KOReader, where a CBZ is the better format (ADR 0045), so the mode that makes the longest books was the one place the app took CBZ away.

What kept CBZ and PDF out was not only the table of contents. A CBZ made from the archive that `mangabind -combine` writes came out in the wrong order in KOReader. mangabind numbers the chapters again from `c001` in every volume, and mangapress wrote each chapter under the name of its last folder, `c001`, `c002`, `c001 (2)`, `c002 (2)`; KOReader's MuPDF orders the pages of a CBZ by their names, so a twelve-page, two-volume test book opened as `6 7 8 0 1 2 9 10 11 3 4 5`. mangapress 0.8.1 keeps each chapter in the folders it was in (`v001 - Vol.01/c001/…`, as KCC 12.0.0 does), and the same book opens as `0 1 2 … 11`. A PDF was already in the right order (checked the same way), and has no outline: mangapress writes none.

## Decision

- **The mode is offered in every format.** Nothing in the app names the formats it works for: the constant `FORMATS_SUPPORTING_COMBINED_VOLUME`, the check of it in the validation of the settings (which therefore no longer takes the format), the check in the workflows and the message that went with them are removed.
- **The format stays the person's choice.** Turning the mode on sets the steps to both and leaves the format as it was; the format is not locked while the mode is on, changing it does not turn the mode off, and an item of the queue, or a title of a library, may have a format of its own (ADR 0046) as it may without the mode. The steps stay locked, as before.
- **The nested table of contents is asked for only where the format has one.** The mangapress adapter sends `--nested-toc` only for an EPUB, which is where mangapress accepts it, so nothing above it has to know. A CBZ or a PDF of a whole series has no navigation inside.
- **The window says what each format gives.** Under the option: an EPUB with the volumes and chapters in its table of contents; a CBZ with the volumes and chapters as folders and no table of contents; a PDF with the pages in order and no table of contents. The banners of the settings, the mapping editor and the library no longer say EPUB.
- **The bundled mangapress must be 0.8.1 or later** for the CBZ to come out in order. The pin was taken in that version before this change (#361).

## Consequences

- A person who turns the mode on with the starting format, CBZ, gets a CBZ, not an EPUB as before. A choice kept from an earlier session, the format and the mode, is read as it was saved.
- Navigation is the reason to choose EPUB for a series, and the window says so; a CBZ or PDF of a whole series is read from first page to last.
- A PDF outline (a flat list of chapters, volume by volume) is not part of this change. It would be mangapress's, and would not need a change here beyond the sentence under the option.
- The guide describes the mode without EPUB as its only format (the quick start, adding manga, the mapping editor, the output profiles page and the overview, in the three languages), and its tutorial picture of the mode is captured again from the interface.
- The baselines of the stories that show the mode, and the texts that carried "EPUB", are drawn again.
