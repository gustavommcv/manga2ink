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
 * The languages the application itself is in, as the structured data of the home pages says them. It
 * is not always the list above (a language of the guide can come before the app has it); a test of the
 * app says when it differs from the app's own list (`languages` of `src/domain/app-settings.ts`).
 */
export const appLanguages = ['en', 'pt-BR', 'ja'];

/**
 * The languages of the guide that still name the controls as the English application does, though the
 * app has them in its own words (ADR 0084). Their pages are switched in a change of their own, and
 * the language leaves this list with it, so that its guide is checked against the app's own words.
 * The names are the `id` of the languages above.
 */
export const guideLabelsInEnglish = ['ja'];

/**
 * The code Google Search Console gives for the "HTML tag" verification method: only the value of
 * the tag's `content` attribute. Empty until the owner supplies the value; see SEO.md.
 */
export const googleSiteVerification = '';

/**
 * Where the heart in the header of every page leads: the page on which a person can support the project.
 * A plain link, with no script of the service on the site (see SEO.md: nothing tracks a visitor). It is
 * also the `buy_me_a_coffee` of `.github/FUNDING.yml` and the `supportAddress` of the app's About tab
 * (`src/main/project-links.ts`); to change service, change all of them (a test of the app says when
 * these three differ).
 */
export const supportUrl = 'https://buymeacoffee.com/gusmonnerat';
