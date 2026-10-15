import { readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { base } from '../../site.config.mjs';

const root = base.replace(/\/?$/, '/');

const fullSizeLabel = {
  '': 'Open full-size logo',
  'pt-br/': 'Abrir logo em tamanho original',
  'ja/': 'ロゴを元のサイズで開く',
};

for (const locale of Object.keys(fullSizeLabel)) {
  for (const colorScheme of ['light', 'dark']) {
    test(`branding loads without replacing the title: ${locale || 'en'} ${colorScheme}`, async ({
      page,
      request,
    }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`${root}${locale}`);
      const header = page.locator('.site-title');
      await expect(header).toHaveAccessibleName('Mangabound');
      await expect(header.locator('span')).toBeVisible();
      const logo = page.locator('.brand-logo');
      await expect(logo).toHaveAccessibleName(fullSizeLabel[locale]);
      for (const image of [header.locator('img'), logo.locator('img')]) {
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
        const dimensions = await image.boundingBox();
        expect(Math.abs(dimensions.width - dimensions.height)).toBeLessThan(1);
      }
      await expect(page.locator('[data-media-slot]')).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const favicon = page.locator('link[rel~="icon"]');
      await expect(favicon).toHaveAttribute('type', 'image/x-icon');
      const faviconUrl = new URL(await favicon.getAttribute('href'), page.url());
      expect(faviconUrl.pathname).toBe(`${root}favicon.ico`);
      const response = await request.get(faviconUrl.href);
      expect(response.ok()).toBe(true);
      expect(await response.body()).toEqual(
        readFileSync(new URL('../../public/favicon.ico', import.meta.url)),
      );
      const installedIcon = await request.get(`${root}mangabound.ico`);
      expect(installedIcon.ok()).toBe(true);
      expect(await installedIcon.body()).toEqual(
        readFileSync(new URL('../../../assets/icons/mangabound.ico', import.meta.url)),
      );
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('introduction.png'), fullPage: true });
      const fullSizeUrl = await logo.getAttribute('href');
      await logo.click();
      await expect(page).toHaveURL(new URL(fullSizeUrl, page.url()).href);
      await expect.poll(() => page.locator('img').evaluate((img) => img.naturalWidth)).toBe(1055);
    });
  }
}

test('high-density screens select a sharp, optimized introduction image', async ({ browser }) => {
  const context = await browser.newContext({
    deviceScaleFactor: 4,
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4329${root}`);
    const image = page.locator('.brand-logo img');
    await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
    const width = (await image.boundingBox()).width;
    const response = await context.request.get(await image.evaluate((img) => img.currentSrc));
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/webp');
    const png = readFileSync(new URL('../../../assets/branding/mangabound.png', import.meta.url));
    expect((await response.body()).length).toBeLessThan(png.length);
    const decodedWidth = await page.evaluate(async () => {
      const img = document.querySelector('.brand-logo img');
      const bitmap = await createImageBitmap(await (await fetch(img.currentSrc)).blob());
      const width = bitmap.width;
      bitmap.close();
      return width;
    });
    expect(decodedWidth).toBeGreaterThanOrEqual(Math.ceil(width * 4));
  } finally {
    await context.close();
  }
});
