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
  { id: 'ja', key: 'ja', directory: 'ja', lang: 'ja', label: '日本語' },
];

/**
 * The code Google Search Console gives for the "HTML tag" verification method: only the value of
 * the tag's `content` attribute. Empty until the owner supplies the value; see SEO.md.
 */
export const googleSiteVerification = '';

/**
 * Where the heart in the header of every page leads: the page on which a person can support the project.
 * A plain link, with no script of the service on the site (see SEO.md: nothing tracks a visitor). It is
 * also the `buy_me_a_coffee` of `.github/FUNDING.yml`; to change service, change both.
 */
export const supportUrl = 'https://buymeacoffee.com/gusmonnerat';
