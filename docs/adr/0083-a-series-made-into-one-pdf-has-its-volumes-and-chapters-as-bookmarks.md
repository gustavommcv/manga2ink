# ADR 0083: A series made into one PDF has its volumes and chapters as bookmarks

- Status: Accepted
- Date: 2026-10-21
- Amends: [ADR 0081](0081-a-series-made-into-one-book-can-be-an-epub-a-cbz-or-a-pdf.md) (it says a PDF of a whole series has no table of contents, and keeps the nested one for an EPUB)
- Relates to: [mangapress ADR 0026](https://github.com/gustavommcv/mangapress/blob/main/docs/adr/0026-a-pdf-has-bookmarks.md)

## Context

ADR 0081 made "Create one book for the series" work in every format. It gave the book two levels of navigation, a volume and its chapters under it, only in an EPUB, because mangapress could not write them anywhere else: a CBZ has none to write, and mangapress refused `--nested-toc` for a PDF. A series made into one PDF was hundreds of pages with no way to reach a volume or a chapter but turning pages, and the window said so under the option.

mangapress 0.8.2 gives a PDF bookmarks, one for each chapter, and with `--nested-toc` a two-level outline: a bookmark for each volume, closed, with its chapters under it. It accepts `--nested-toc` for a PDF and still refuses it for a CBZ. The pin was taken in that version before this change (#366). Read back with KOReader's MuPDF, a series of three volumes made into a PDF lists each volume with its chapters under it, each on the page it opens.

## Decision

- **The mangapress adapter sends `--nested-toc` for a PDF as well as for an EPUB**, and not for a CBZ. The rule is one list of the formats that have two levels of contents (an EPUB's table of contents and a PDF's bookmarks) in the adapter, which is where the tool's own rule lives; nothing above it changes.
- **The window says what a PDF of a series has**: under the option, "the pages in order and bookmarks for the volumes and chapters"; in the mapping editor, that the volumes become the top level of the single book, in the table of contents of an EPUB, in the bookmarks of a PDF, as folders in a CBZ. The CBZ keeps its note: the volumes and chapters as folders, and no table of contents.
- **The guide says the same** in the quick start, the overview, the mapping editor and the output profiles page, in the three languages. EPUB is no longer "the format to choose to move between chapters": EPUB and PDF both are.

## Consequences

- A person who turns the mode on and chooses PDF gets a book whose reader lists the volumes and, under each, its chapters. For a CBZ nothing changes, and EPUB keeps its table of contents.
- The app needs mangapress 0.8.2 or later for this: an older one refuses `--nested-toc` for a PDF and the run fails. The pin is that version, so the two move together.
- The bookmarks of a PDF start closed at the volume level, and are as the reader shows them; the app does not choose how a reader draws them.
- A PDF of a series is still not a way to read it better than a CBZ (ADR 0045): this makes a PDF a fair choice for someone who wants the navigation, nothing more.
