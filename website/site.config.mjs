export const site = 'https://gustavommcv.github.io';
export const base = process.env.BASE_PATH || '/mangabound/';

/**
 * The languages of the site, the default one first. `id` is how the checks and the list of untranslated
 * pages name a language; `key` is its key in Starlight's `locales`; `directory` is where its pages are
 * under `src/content/docs`, empty for the default language; `lang` is the language tag of its pages.
 */
export const languages = [
  { id: 'en', key: 'root', directory: '', lang: 'en', label: 'English' },
  { id: 'pt-br', key: 'pt-br', directory: 'pt-br', lang: 'pt-BR', label: 'Português (Brasil)' },
];

/**
 * The code Google Search Console gives for the "HTML tag" verification method: only the value of
 * the tag's `content` attribute. Empty until the owner supplies the value; see SEO.md.
 */
export const googleSiteVerification = '';
