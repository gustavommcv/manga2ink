# ADR 0069: The site suggests the language the browser asks for, and never changes it by itself

- Status: Accepted
- Date: 2026-10-18
- Relates to: [ADR 0033](0033-static-documentation-site-in-an-independent-package.md) (the guide is a static site of its own), [ADR 0051](0051-a-language-of-the-guide-may-leave-pages-in-english.md) (a page a language does not translate is Starlight's fallback page at the same address)

## Context

The guide is in English, Brazilian Portuguese and Japanese. A reader who comes from a search, or from a link someone shared, lands on the page in whichever language that link was for, and the selector of the language is a small control in the header. A person whose browser is set to Japanese can read a whole page in English before finding it.

Sending the reader to their language by itself (a redirect) was not considered: a link would not lead to the page it was written for, a search engine or a person who shares a link would be sent somewhere they did not choose, and the reader who wants the other language has no way to say so.

## Decision

- **A suggestion at the top of the page, which the reader can answer.** When the first language of the browser's list (`navigator.languages`) that the site has is not the language of the page, a short bar at the top of the content says so, in the language it suggests, with three answers: **switch** (the same page in that language), **not now** (put away for this visit) and **don't ask again** (put away for good). Nothing changes until the reader answers.
- **Only the language is compared, and the first that the site has wins.** `pt-PT` comes to the Brazilian Portuguese of the site, as the application does; a browser that asks for `de` and then `ja` is suggested Japanese; a browser that asks for none of the three is suggested nothing. A page already in the first language of the list is suggested nothing, and neither is the not-found page, which is at no address in another language. The rule is `languageToSuggest` in `website/src/language-suggestion.mjs`, tried by unit tests.
- **The same page.** The address of the page in each language is worked out when the site is built (`pathsInEachLanguage`), so the link keeps the page, the search string and the part after `#` of what was open. Every language has every page, a translated one or Starlight's fallback, so the address exists.
- **Written for the person it is for.** The words are in `src/i18n/strings.ts`, in each language's own catalog, and the bar is written in the language it suggests, with that `lang`. They are in `<template>` elements that the script opens, not text of the page: a search engine and the search of the guide do not read a Portuguese sentence on an English page, and nothing of it is in the page for a reader who is not suggested anything. The bar sits in Starlight's own banner slot (the `Banner` component), below the header and above the title.
- **What the reader decided stays in their browser, and nowhere else.** _Don't ask again_ is `localStorage` (`mangabound-language-suggestion`); _not now_ is `sessionStorage`, so it lasts the visit and comes back in a new tab; choosing a language, with the selector of the site or with the suggestion, remembers that language (`mangabound-language-chosen`) and a page in it suggests nothing, while a page in another language still does. A browser that will not keep these (a private window, blocked storage) shows the suggestion on each page, which is the cost of not remembering. No cookie is set, nothing is sent, and the only script is the site's own (the rule in `SEO.md` that nothing tracks a visitor holds, and a browser test still fails on a script from another origin).

## Consequences

- A reader whose browser is in another language of the guide is told, once and politely, and can read it at once. A reader who does not want to be told says so once.
- Search engines and shared links are as they were: each address shows its own language.
- A language added to the site (an entry in `languages` of `site.config.mjs` and its catalog in `strings.ts`) is suggested and suggests the others without another change; a language whose catalog lacks its words for it fails the type check, as it fails for any other words of the components.
- The decision of a reader who chose a language with the selector is remembered per language, not as a general wish: a page in another language still suggests their browser's, which is what a person who reads Japanese pages by choice and has an English browser would want to turn off with _don't ask again_.
