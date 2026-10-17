import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { languages } from '@/domain/app-settings';
import { projectLinkAddress, supportAddress } from '@/main/project-links';
import { projectLinks } from '@/shared/project-links-contract';

const root = path.resolve(import.meta.dirname, '../..');
const version = '0.1.0-alpha.15';

describe('the addresses the About tab can open', () => {
  it.each(languages.flatMap((language) => projectLinks.map((link) => [link, language] as const)))(
    '%s in %s is a plain https address',
    (link, language) => {
      const address = new URL(projectLinkAddress(link, language, version));

      expect(address.protocol).toBe('https:');
      expect(address.username).toBe('');
      expect(address.password).toBe('');
    },
  );

  it('are the ones a person expects', () => {
    expect(projectLinkAddress('repository', 'en', version)).toBe(
      'https://github.com/gustavommcv/mangabound',
    );
    expect(projectLinkAddress('issues', 'en', version)).toBe(
      'https://github.com/gustavommcv/mangabound/issues',
    );
    expect(projectLinkAddress('license', 'en', version)).toBe(
      'https://github.com/gustavommcv/mangabound/blob/main/LICENSE',
    );
    expect(projectLinkAddress('third-party-notices', 'en', version)).toBe(
      'https://github.com/gustavommcv/mangabound/blob/main/THIRD-PARTY-NOTICES.md',
    );
    expect(projectLinkAddress('releases', 'pt-BR', version)).toBe(
      'https://github.com/gustavommcv/mangabound/releases',
    );
    expect(projectLinkAddress('mangadex', 'en', version)).toBe('https://mangadex.org/');
    expect(projectLinkAddress('support', 'en', version)).toBe(supportAddress);
  });

  it('send the release notes to the page of the version that is running, whatever the language', () => {
    expect(projectLinkAddress('release-notes', 'en', '0.1.0-alpha.15')).toBe(
      'https://github.com/gustavommcv/mangabound/releases/tag/v0.1.0-alpha.15',
    );
    expect(projectLinkAddress('release-notes', 'pt-BR', '1.2.3')).toBe(
      'https://github.com/gustavommcv/mangabound/releases/tag/v1.2.3',
    );
  });

  it('keeps a version that is not plain from changing where the address goes', () => {
    const address = new URL(projectLinkAddress('release-notes', 'en', '1.0/../../issues?x=1#y'));

    expect(address.origin).toBe('https://github.com');
    expect(address.pathname.startsWith('/gustavommcv/mangabound/releases/tag/v')).toBe(true);
    expect(address.search).toBe('');
    expect(address.hash).toBe('');
  });

  it('send the guide to the site in the language of the window', () => {
    expect(projectLinkAddress('guide', 'en', version)).toBe(
      'https://gustavommcv.github.io/mangabound/',
    );
    expect(projectLinkAddress('guide', 'pt-BR', version)).toBe(
      'https://gustavommcv.github.io/mangabound/pt-br/',
    );
  });

  it('leave everything else the same whatever the language of the window', () => {
    for (const link of projectLinks.filter((name) => name !== 'guide')) {
      expect(projectLinkAddress(link, 'pt-BR', version), link).toBe(
        projectLinkAddress(link, 'en', version),
      );
    }
  });
});

describe('the page that supports the project', () => {
  it('is the same in the app, on the website and in the funding file', async () => {
    const site = await readFile(path.join(root, 'website/site.config.mjs'), 'utf8');
    const funding = await readFile(path.join(root, '.github/FUNDING.yml'), 'utf8');

    const onTheSite = /export const supportUrl = '([^']+)'/u.exec(site)?.[1];
    const keys = /^buy_me_a_coffee:\s*(\S+)\s*$/mu.exec(funding)?.[1];

    expect(onTheSite).toBe(supportAddress);
    expect(`https://buymeacoffee.com/${keys ?? ''}`).toBe(supportAddress);
  });
});
