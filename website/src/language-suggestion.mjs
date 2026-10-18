// The rules of the suggestion of a language that a reader is shown at the top of a page (ADR 0069):
// which language of the site the reader's own languages come to, where the same page is in each
// language, and when the suggestion is not shown. They are here, apart from the page, so that a test can
// try them without a browser; the script of the page only reads and writes the browser's storage.

/**
 * The language of the site that the languages a reader asked their browser for come to first, or
 * `undefined` when none of them is a language of the site. Only the language is compared, not the region:
 * `pt-PT` comes to the Brazilian Portuguese of the site, as the application does, and `en-GB` to English.
 *
 * @param {readonly string[]} readerLanguages the browser's languages, the most wanted first
 * @param {readonly string[]} siteLanguages the language tags of the site's pages (`en`, `pt-BR`, `ja`)
 * @returns {string | undefined}
 */
export function preferredSiteLanguage(readerLanguages, siteLanguages) {
  const primary = (tag) => tag.toLowerCase().split('-')[0];
  for (const tag of readerLanguages) {
    const found = siteLanguages.find((language) => primary(language) === primary(tag));
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Where the page that is being read is in each language of the site: the pages are the same in every
 * language, under the language's directory (none for the default language), and a page that is not
 * translated is Starlight's fallback page at the same place (ADR 0051), so every address exists.
 *
 * @param {{ base: string, pathname: string, languages: readonly { lang: string, directory: string }[] }} site
 * @returns {Record<string, string>} the path of the page, by language tag
 */
export function pathsInEachLanguage({ base, pathname, languages }) {
  const root = base.replace(/\/?$/, '/');
  const inside = pathname.startsWith(root)
    ? pathname.slice(root.length)
    : pathname.replace(/^\//, '');
  const own = languages.find(
    ({ directory }) => directory !== '' && inside.startsWith(`${directory}/`),
  );
  const rest = own === undefined ? inside : inside.slice(own.directory.length + 1);
  return Object.fromEntries(
    languages.map(({ lang, directory }) => [
      lang,
      `${root}${directory === '' ? '' : `${directory}/`}${rest}`,
    ]),
  );
}

/**
 * The language to suggest to a reader, or `undefined` when nothing is to be suggested: the reader
 * said not to ask again, or put the suggestion away for this visit, or chose the language of this page
 * on purpose (with the selector of the site, or with this suggestion), or the page is already in the
 * first language of theirs that the site has, or the site has none of theirs.
 *
 * @param {{ current: string, readerLanguages: readonly string[], siteLanguages: readonly string[], never: boolean, dismissed: boolean, chosen: string | undefined }} state
 * @returns {string | undefined}
 */
export function languageToSuggest({
  current,
  readerLanguages,
  siteLanguages,
  never,
  dismissed,
  chosen,
}) {
  if (never || dismissed || chosen === current) return undefined;
  const preferred = preferredSiteLanguage(readerLanguages, siteLanguages);
  return preferred === current ? undefined : preferred;
}
