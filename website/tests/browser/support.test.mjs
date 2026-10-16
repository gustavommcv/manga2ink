import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { base, supportUrl } from '../../site.config.mjs';

const root = base.replace(/\/?$/, '/');

const label = {
  '': 'Support the project',
  'pt-br/': 'Apoie o projeto',
  'ja/': 'プロジェクトを支援する',
};

for (const locale of Object.keys(label)) {
  for (const colorScheme of ['light', 'dark']) {
    test(`a heart in the header leads to the page where the project can be supported, in the page's language: ${locale || 'en'} ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      // An inner page, to see that it is on every page and not on the home alone.
      await page.goto(`${root}${locale}getting-started/quickstart/`);
      // On a narrow screen the heart is in the menu that the button of the page opens.
      if (testInfo.project.name === 'mobile') {
        await page.locator('button.sl-menu-button').click();
      }
      const links = page.locator(`a[href="${supportUrl}"]`);
      const link = links.filter({ visible: true }).first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAccessibleName(label[locale]);
      await expect(link).toHaveAttribute('title', label[locale]);
      await expect(link).toHaveAttribute('rel', /noopener/);
      // A plain link: nothing of the service is loaded into the page.
      const scripts = await page
        .locator('script[src]')
        .evaluateAll((nodes) => nodes.map((node) => node.src));
      expect(
        scripts.filter((src) => !src.startsWith(page.url().split('/').slice(0, 3).join('/'))),
      ).toEqual([]);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
    });
  }
}
