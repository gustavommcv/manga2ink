import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { base } from '../../site.config.mjs';

const root = base.replace(/\/?$/, '/');
const pages = ['cropping', 'color-and-tone', 'double-page-spreads'];

for (const locale of ['', 'pt-br/']) {
  for (const colorScheme of ['light', 'dark']) {
    for (const slug of pages) {
      test(`option pictures load and the page is accessible: ${slug} ${locale || 'en'} ${colorScheme}`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(`${root}${locale}user-guide/advanced-options/${slug}/`);

        // Pictures are lazy: bring each into view so that it loads, then check it did.
        const pictures = page.locator('[data-option-example] img');
        const count = await pictures.count();
        expect(count).toBeGreaterThan(0);
        for (let index = 0; index < count; index++) {
          const picture = pictures.nth(index);
          await picture.scrollIntoViewIfNeeded();
          await expect
            .poll(() => picture.evaluate((image) => image.complete && image.naturalWidth > 0))
            .toBe(true);
          expect(await picture.getAttribute('alt')).not.toBe('');
        }

        // The page does not scroll sideways, at desktop or at phone width.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);

        const scan = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(scan.violations).toEqual([]);
      });
    }
  }
}

for (const slug of ['cropping', 'double-page-spreads']) {
  test(`every picture of an example says which flags made it, and every table says its source: ${slug}`, async ({
    page,
  }) => {
    await page.goto(`${root}user-guide/advanced-options/${slug}/`);
    for (const caption of await page.locator('[data-option-example] figcaption').all()) {
      await expect(caption.locator('code')).toHaveText(/^(--[a-z-]+.*|no flag|not converted)$/);
      await expect(caption).toContainText(/\d+ × \d+ px, \d+ KB/);
    }
    for (const table of await page.locator('[data-option-sizes] table').all()) {
      await expect(table.locator('caption')).toContainText('Source page:');
    }
    await expect(page.locator('.credit').first()).toContainText('CC BY-SA 4.0');
  });
}

for (const locale of ['', 'pt-br/']) {
  for (const colorScheme of ['light', 'dark']) {
    test(`the overview of the options is accessible: ${locale || 'en'} ${colorScheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`${root}${locale}user-guide/advanced-options/`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
    });
  }
}

for (const locale of ['', 'pt-br/']) {
  test(`a table of sizes can be scrolled with the keyboard on a very narrow screen: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`${root}${locale}user-guide/advanced-options/cropping/`);
    const regions = page.locator('[data-option-sizes][role="region"]');
    expect(await regions.count()).toBeGreaterThan(0);
    for (const region of await regions.all()) {
      await expect(region).toHaveAttribute('tabindex', '0');
      await expect(region).toHaveAttribute('aria-label', /.+: .+/);
    }
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}
