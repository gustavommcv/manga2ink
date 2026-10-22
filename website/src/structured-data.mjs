import { appLanguages } from '../site.config.mjs';

const application = {
  '@type': 'SoftwareApplication',
  name: 'Manga2Ink',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Windows, macOS, Linux',
  inLanguage: appLanguages,
  downloadUrl: 'https://github.com/gustavommcv/manga2ink/releases',
  license: 'https://opensource.org/license/mit',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Gustavo Monnerat', url: 'https://github.com/gustavommcv' },
};

/**
 * What a search engine is told about a page, as schema.org data: the application and the site on
 * a language's home page, and the way back to that home page on every other page.
 *
 * @param {{ url: string, home: string, title: string, description: string, lang: string }} page
 */
export function structuredData({ url, home, title, description, lang }) {
  if (url !== home) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Manga2Ink', item: home },
        { '@type': 'ListItem', position: 2, name: title, item: url },
      ],
    };
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'Manga2Ink', url: home, inLanguage: lang, description },
      { ...application, url: home, description },
    ],
  };
}

/** JSON for a script element: a `<` in a title cannot close the element early. */
export const scriptJson = (data) => JSON.stringify(data).replaceAll('<', '\\u003c');
