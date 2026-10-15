# ADR 0051: A language of the guide may leave pages in English until they are translated

- Status: Accepted
- Date: 2026-10-15
- Relates to: [ADR 0033](0033-static-documentation-site-in-an-independent-package.md) (the guide is a static site of its own, in English and Brazilian Portuguese)

## Context

The guide had two languages, and a check required every page of one to exist in the other. Japanese is the third. It is a language the maintainers cannot review themselves, and the guide is about 19,000 English words in 26 pages, so asking for all of it before the language exists would mean either not adding it or publishing a long translation nobody has read. The pages a new reader needs (the home page, installation, the quick start, adding manga, the KOReader pages) matter most, and the reference pages least.

Starlight already has the mechanism: a page that a language does not have is built under the language's address with the text of the default language and a notice that says so.

## Decision

- **A language may leave pages untranslated, on a list.** `website/i18n-gaps.json` names, for a language, the English pages it does not translate yet. Everything not on the list must be translated, as before: the parity check fails for a missing page, for a translated page with no English source, and for an entry of the list that is translated already or is not a page, so the list can only get shorter and cannot rot. Portuguese has an empty list, and stays complete.
- **Such a page is Starlight's fallback page**, with its notice. Its text is marked as English by Starlight (`lang` on the main content), and the components on it, which write their own captions and table heads, write them in English too (`stringsFor(route)` reads `route.isFallback`), so a Japanese caption is never under an English picture. A language with no catalog of component words fails the build.
- **A title is unique within a language**, not across the site: a fallback page has the title of the English one. The other checks of the search data apply to it unchanged.
- **Fallback pages stay indexable**, as Starlight builds them (a canonical address of their own, the language alternatives, the sitemap). The text is duplicated under the language's address; a `noindex` or a canonical to the English page would mean a different rule for every page as it gets translated, and would leave the language alternatives pointing at pages a search engine was told to skip. If this proves a problem for search, it is a change of the route data and does not touch the pages.
- **The Japanese home page says what is not done**: that the translation goes on, that the untranslated pages are shown in English, that the translation was made with the help of AI (as the repository says of its contributions), and where to report a mistake.

## Consequences

- A page is added to the guide in English first. For a language with a list, the new page is in the list until someone translates it; the check does not ask for it.
- The options pictures, which have no words, are shared by every language. A language that translates an advanced-options page writes the alt texts of its examples; one that leaves the pages out leaves their examples out too (the options check follows the list).
- The labels of the application's controls stay in English in every language of the guide, as they are in the application. When the application gets translations, the guides of those languages will use the translated labels, and the check of the labels will read each language's own text of the application; that is a separate decision.
- A page that is translated gets headings with other anchors, and the pages still in English link to it by the English ones. The translated page keeps the English anchors that the link check reports missing, as an empty `<span id>` before the heading; the check names them.
- Review by someone who reads Japanese is welcome on every page, and nothing makes it a condition of merging: the pages say they were translated with AI help.
