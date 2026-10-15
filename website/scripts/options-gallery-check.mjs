// What must hold between the option examples, the pages that show them and the tool they were made
// with. Pure: scripts/verify-options-gallery.mjs reads the files and passes them in.

const EXAMPLE_REFERENCE = /<Option(?:Example|Sizes|Book)\b[^>]*?\bid="([^"]+)"/g;

/** The ids of the examples a page uses, in the order it uses them. */
export function referencedExamples(text) {
  return [...text.matchAll(EXAMPLE_REFERENCE)].map((match) => match[1]);
}

const longFlags = (flags) => flags.filter((flag) => flag.startsWith('--'));

/**
 * The problems found, as sentences; an empty list means all is well.
 *
 * - manifest: the manifest the generator wrote.
 * - pin: the mangapress version Mangabound ships.
 * - pictures: file name -> SHA-256 of each picture in the assets folder.
 * - licenses: the text of LICENSES.md, which lists the pictures with the licence of their source.
 * - userFlags: every flag of mangapress that a person can choose, from schemas/cli-capabilities.json.
 * - coverage: { pages: { slug: [flag] }, elsewhere: { 'docs/path': [flag] }, planned: [slug] }.
 * - pages: { en: { slug: text }, 'pt-br': { slug: text } } for the advanced-options pages that exist,
 *   one entry for each language of the site, named by its `id`,
 *   `index` being the overview page, which must list every option the coverage names.
 * - guides: { en: { path: text }, 'pt-br': { path: text } } for the other pages the coverage points to.
 * - untranslated: { 'pt-br': [path] }, the pages (paths under the docs folder, without the extension) that a
 *   language leaves untranslated on purpose, which it need not have, and the examples that only they use.
 */
export function checkGallery({
  manifest,
  pin,
  pictures,
  licenses,
  userFlags,
  coverage,
  pages,
  guides,
  untranslated = {},
}) {
  const problems = [];
  const locales = Object.keys(pages);
  const optionsFolder = 'user-guide/advanced-options';
  const left = (locale, path) => (untranslated[locale] ?? []).includes(path);

  if (manifest.mangapress !== pin) {
    problems.push(
      `The pictures were made with mangapress ${manifest.mangapress}, and Mangabound ships ${pin}. Run npm run site:options.`,
    );
  }

  const listed = new Set();
  for (const [id, example] of Object.entries(manifest.examples)) {
    if (example.variants.some((variant) => variant.file)) {
      if (!example.license)
        problems.push(`${id}: the licence of its pictures is not in the manifest.`);
      if (!licenses.includes(`\`${id}-*.webp\``))
        problems.push(`${id}: its pictures are not in LICENSES.md. Run npm run site:options.`);
    }
    for (const variant of example.variants) {
      if (!variant.file) continue;
      listed.add(variant.file);
      const actual = pictures.get(variant.file);
      if (actual === undefined) problems.push(`${id}: the picture ${variant.file} is missing.`);
      else if (actual !== variant.sha256) {
        problems.push(
          `${id}: ${variant.file} is not the file the manifest describes. Run npm run site:options.`,
        );
      }
    }
  }
  for (const file of pictures.keys()) {
    if (!listed.has(file)) problems.push(`${file} is in the assets folder and in no example.`);
  }

  const used = Object.fromEntries(locales.map((locale) => [locale, new Set()]));
  for (const locale of locales) {
    for (const [slug, text] of Object.entries(pages[locale])) {
      for (const id of referencedExamples(text)) {
        used[locale].add(id);
        if (!(id in manifest.examples))
          problems.push(`${locale}/${slug}: there is no example called ${id}.`);
      }
    }
  }
  // An example is on a page of every language, unless the pages that show it are left out of a language.
  const shownBy = {};
  for (const [slug, text] of Object.entries(pages[locales[0]])) {
    for (const id of referencedExamples(text))
      (shownBy[id] ??= []).push(`${optionsFolder}/${slug}`);
  }
  for (const id of Object.keys(manifest.examples)) {
    for (const locale of locales) {
      const needed = (shownBy[id] ?? []).some((path) => !left(locale, path));
      if (!used[locale].has(id) && (needed || !(id in shownBy)))
        problems.push(`The example ${id} is on no page in ${locale}.`);
    }
  }

  const claimed = new Map();
  const claim = (flags, where) => {
    for (const flag of flags) {
      if (claimed.has(flag))
        problems.push(`${flag} is listed under ${claimed.get(flag)} and under ${where}.`);
      else claimed.set(flag, where);
    }
  };
  for (const [slug, flags] of Object.entries(coverage.pages)) claim(flags, `the page ${slug}`);
  for (const [path, flags] of Object.entries(coverage.elsewhere)) claim(flags, path);
  for (const flag of userFlags) {
    if (!claimed.has(flag)) problems.push(`${flag} is a mangapress option and no page covers it.`);
  }
  for (const flag of claimed.keys()) {
    if (!userFlags.includes(flag))
      problems.push(`${flag} is covered, but mangapress has no such option.`);
  }

  const planned = new Set(coverage.planned);
  for (const [slug, flags] of Object.entries(coverage.pages)) {
    const present = locales.filter((locale) => slug in pages[locale]);
    if (present.length === 0) {
      if (!planned.has(slug)) problems.push(`The page ${slug} covers options and does not exist.`);
      continue;
    }
    if (planned.has(slug)) problems.push(`The page ${slug} exists and is still listed as planned.`);
    for (const locale of locales.filter((candidate) => !present.includes(candidate))) {
      if (!left(locale, `${optionsFolder}/${slug}`))
        problems.push(`The page ${slug} has no ${locale} version.`);
    }
    for (const locale of present) {
      for (const flag of longFlags(flags)) {
        if (!pages[locale][slug].includes(flag))
          problems.push(`${locale}/${slug} does not mention ${flag}.`);
      }
    }
  }
  for (const slug of planned) {
    if (!(slug in coverage.pages)) problems.push(`${slug} is planned and covers no option.`);
  }
  for (const [path, flags] of Object.entries(coverage.elsewhere)) {
    for (const locale of locales) {
      const text = guides[locale][path];
      if (text === undefined) {
        if (!left(locale, path))
          problems.push(`${locale}/${path} is where options are covered, and it does not exist.`);
        continue;
      }
      for (const flag of longFlags(flags)) {
        if (!text.includes(flag)) problems.push(`${locale}/${path} does not mention ${flag}.`);
      }
    }
  }

  // The overview page lists every option, so that a flag is found from there in either language.
  for (const locale of locales) {
    const listing = pages[locale].index;
    if (listing === undefined) {
      if (!left(locale, `${optionsFolder}/index`))
        problems.push(`The overview page of the options does not exist in ${locale}.`);
      continue;
    }
    for (const flag of longFlags([...claimed.keys()])) {
      if (!listing.includes(flag))
        problems.push(`The overview in ${locale} does not list ${flag}.`);
    }
  }

  return problems;
}
