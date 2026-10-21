import type { Language } from '@/domain/app-settings';
import type { ProjectLink } from '@/shared/project-links-contract';

const repository = 'https://github.com/gustavommcv/mangabound';

/**
 * The guide is the site's, and the site keeps each language under its own path. A language is
 * added here by one entry, and the compiler says so when it is missing.
 */
const guide: Readonly<Record<Language, string>> = {
  en: 'https://gustavommcv.github.io/mangabound/',
  'pt-BR': 'https://gustavommcv.github.io/mangabound/pt-br/',
  ja: 'https://gustavommcv.github.io/mangabound/ja/',
};

/**
 * Where the page that supports the project is. It is also the `supportUrl` of the website
 * (`website/site.config.mjs`) and the `buy_me_a_coffee` of `.github/FUNDING.yml`, here and in
 * mangabind and mangapress: to change service, change all of them (a test says when this repository's
 * two differ).
 */
export const supportAddress = 'https://buymeacoffee.com/gusmonnerat';

/**
 * The address a link goes to, always https. `version` is the one that is running, which names the
 * page of its release notes: the tag of a release is its version with a `v`.
 */
export function projectLinkAddress(link: ProjectLink, language: Language, version: string): string {
  switch (link) {
    case 'guide':
      return guide[language];
    case 'repository':
      return repository;
    case 'issues':
      return `${repository}/issues`;
    case 'release-notes':
      return `${repository}/releases/tag/v${encodeURIComponent(version)}`;
    case 'releases':
      return `${repository}/releases`;
    case 'license':
      return `${repository}/blob/main/LICENSE`;
    case 'third-party-notices':
      return `${repository}/blob/main/THIRD-PARTY-NOTICES.md`;
    case 'support':
      return supportAddress;
    case 'mangadex':
      return 'https://mangadex.org/';
  }
}
