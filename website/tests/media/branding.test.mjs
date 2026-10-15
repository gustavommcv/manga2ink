import { expect, test } from '@playwright/test';

import { base } from '../../site.config.mjs';

for (const locale of ['', 'pt-br/', 'ja/']) {
  test(`the real logo and its full-size link load during development: ${locale || 'en'}`, async ({
    page,
    request,
  }) => {
    await page.goto(`${base.replace(/\/?$/, '/')}${locale}`);
    for (const image of [page.locator('.site-title img'), page.locator('.brand-logo img')]) {
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
    }
    await expect(page.locator('[data-media-slot]')).toHaveCount(0);
    const favicon = page.locator('link[rel~="icon"]');
    const faviconUrl = new URL(await favicon.getAttribute('href'), page.url());
    expect(faviconUrl.pathname).toBe(`${base.replace(/\/?$/, '/')}favicon.ico`);
    expect((await request.get(faviconUrl.href)).ok()).toBe(true);
    const fullSize = page.locator('.brand-logo');
    const url = new URL(await fullSize.getAttribute('href'), page.url()).href;
    const response = await page.goto(url);
    expect(response.status()).toBe(200);
    await expect.poll(() => page.locator('img').evaluate((img) => img.naturalWidth)).toBe(1055);
  });
}
