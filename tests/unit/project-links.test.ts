import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { languages } from '@/domain/app-settings';
import { projectLinkAddress, supportAddress } from '@/main/project-links';
import { projectLinks } from '@/shared/project-links-contract';

const root = path.resolve(import.meta.dirname, '../..');

describe('the addresses the About tab can open', () => {
  it.each(languages.flatMap((language) => projectLinks.map((link) => [link, language] as const)))(
    '%s in %s is a plain https address',
    (link, language) => {
      const address = new URL(projectLinkAddress(link, language));

      expect(address.protocol).toBe('https:');
      expect(address.username).toBe('');
      expect(address.password).toBe('');
    },
  );

  it('are the ones a person expects', () => {
    expect(projectLinkAddress('repository', 'en')).toBe(
      'https://github.com/gustavommcv/mangabound',
    );
    expect(projectLinkAddress('issues', 'en')).toBe(
      'https://github.com/gustavommcv/mangabound/issues',
    );
    expect(projectLinkAddress('license', 'en')).toBe(
      'https://github.com/gustavommcv/mangabound/blob/main/LICENSE',
    );
    expect(projectLinkAddress('third-party-notices', 'en')).toBe(
      'https://github.com/gustavommcv/mangabound/blob/main/THIRD-PARTY-NOTICES.md',
    );
    expect(projectLinkAddress('mangadex', 'en')).toBe('https://mangadex.org/');
    expect(projectLinkAddress('support', 'en')).toBe(supportAddress);
  });

  it('send the guide to the site in the language of the window', () => {
    expect(projectLinkAddress('guide', 'en')).toBe('https://gustavommcv.github.io/mangabound/');
    expect(projectLinkAddress('guide', 'pt-BR')).toBe(
      'https://gustavommcv.github.io/mangabound/pt-br/',
    );
  });

  it('leave everything else the same whatever the language of the window', () => {
    for (const link of projectLinks.filter((name) => name !== 'guide')) {
      expect(projectLinkAddress(link, 'pt-BR'), link).toBe(projectLinkAddress(link, 'en'));
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
