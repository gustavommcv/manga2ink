import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { base } from '../../site.config.mjs';

const root = base.replace(/\/?$/, '/');
// Pages with pictures, and pages that are tables of values read back from books.
const pictured = [
  'reading',
  'cropping',
  'color-and-tone',
  'double-page-spreads',
  'size-and-borders',
  'page-images',
  'cover',
];
const tablesOnly = ['book-metadata'];

async function expectNoSidewaysScroll(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectAccessible(page) {
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
}

for (const locale of ['', 'pt-br/']) {
  for (const colorScheme of ['light', 'dark']) {
    for (const slug of pictured) {
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
        await expectNoSidewaysScroll(page);
        await expectAccessible(page);
      });
    }

    for (const slug of tablesOnly) {
      test(`the tables of values are accessible: ${slug} ${locale || 'en'} ${colorScheme}`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(`${root}${locale}user-guide/advanced-options/${slug}/`);
        expect(await page.locator('[data-option-book] table').count()).toBeGreaterThan(0);
        await expectNoSidewaysScroll(page);
        await expectAccessible(page);
      });
    }
  }
}

for (const slug of [
  'cropping',
  'double-page-spreads',
  'size-and-borders',
  'page-images',
  'cover',
]) {
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
    await expect(page.locator('.credit').first()).toContainText(/CC BY(-SA)? 4\.0/);
  });
}

test('every table of values says which row it is, the flags given and that it was measured: reading and book metadata', async ({
  page,
}) => {
  for (const slug of ['reading', 'cover', 'book-metadata']) {
    await page.goto(`${root}user-guide/advanced-options/${slug}/`);
    const tables = page.locator('[data-option-book] table');
    expect(await tables.count()).toBeGreaterThan(0);
    for (const table of await tables.all()) {
      await expect(table.locator('caption')).toContainText('Measured with mangapress');
      await expect(table.locator('thead th').nth(1)).toHaveText('On the command line');
      for (const flags of await table.locator('tbody tr td:nth-child(2) code').all()) {
        await expect(flags).toHaveText(/^(--?[a-z-]+.*|no flag)$/);
      }
    }
  }
  // The pictures of the reading page come from the same example kinds as the other pages.
  await page.goto(`${root}user-guide/advanced-options/reading/`);
  for (const caption of await page.locator('[data-option-example] figcaption').all()) {
    await expect(caption.locator('code')).toHaveText(/^(--[a-z-]+.*|no flag|not converted)$/);
    await expect(caption).toContainText(/\d+ × \d+ px, \d+ KB/);
  }
  await expect(page.locator('.credit').first()).toContainText(/CC BY(-SA)? 4\.0/);
});

test('the captions, tables and credits of the examples are in Portuguese on the Portuguese pages', async ({
  page,
}) => {
  await page.goto(`${root}pt-br/user-guide/advanced-options/reading/`);
  for (const caption of await page.locator('[data-option-example] figcaption').all()) {
    await expect(caption.locator('code')).toHaveText(/^(--[a-z-]+.*|sem flag|sem conversão)$/);
    await expect(caption).toContainText(/páginas: \d+ × \d+, .* px, \d+ KB/);
  }
  await expect(page.locator('[data-option-example] a').first()).toHaveAttribute(
    'title',
    'Abrir imagem em tamanho maior',
  );
  await expect(page.locator('.credit').first()).toContainText('Convertida com o mangapress');
  const table = page.locator('[data-option-book] table').first();
  await expect(table.locator('caption')).toContainText('Medido com o mangapress');
  await expect(table.locator('thead th').nth(1)).toHaveText('No terminal');
  await expect(table.locator('tbody tr').first().locator('td code')).toHaveText('sem flag');

  await page.goto(`${root}pt-br/user-guide/advanced-options/book-metadata/`);
  await expect(page.locator('[data-option-book]').first()).toHaveAttribute(
    'aria-label',
    /^valores medidos: /,
  );
  await expect(page.getByRole('cell', { name: 'não consta do livro' }).first()).toBeVisible();

  await page.goto(`${root}pt-br/user-guide/advanced-options/size-and-borders/`);
  await expect(page.locator('.screen-note').first()).toContainText('O cinza é a tela em volta');
  await page.goto(`${root}pt-br/user-guide/advanced-options/cropping/`);
  await expect(page.locator('[data-option-sizes] caption').first()).toContainText(
    'Página de origem:',
  );
});

for (const locale of ['', 'pt-br/']) {
  for (const colorScheme of ['light', 'dark']) {
    test(`the overview of the options is accessible: ${locale || 'en'} ${colorScheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`${root}${locale}user-guide/advanced-options/`);
      await expectNoSidewaysScroll(page);
      await expectAccessible(page);
    });
  }
}

for (const locale of ['', 'pt-br/']) {
  for (const slug of ['cropping', 'page-images', 'reading', 'cover', 'book-metadata']) {
    test(`a table can be scrolled with the keyboard on a very narrow screen: ${slug} ${locale || 'en'}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(`${root}${locale}user-guide/advanced-options/${slug}/`);
      const regions = page.locator(
        '[data-option-sizes][role="region"], [data-option-book][role="region"]',
      );
      expect(await regions.count()).toBeGreaterThan(0);
      for (const region of await regions.all()) {
        await expect(region).toHaveAttribute('tabindex', '0');
        await expect(region).toHaveAttribute('aria-label', /.+: .+/);
      }
      await expectAccessible(page);
    });
  }
}
