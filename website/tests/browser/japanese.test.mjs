import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { base } from '../../site.config.mjs';

const root = base.replace(/\/?$/, '/');
const notice = 'このコンテンツはまだ日本語訳がありません。';

/** The button that opens the navigation on a narrow screen is named in the language of the page. */
async function openNavigation(page, name = 'メニュー') {
  const menu = page.getByRole('button', { name, exact: true });
  if (await menu.isVisible()) await menu.click();
}

test('the Japanese home page is in Japanese, and so is the sidebar', async ({ page }) => {
  await page.goto(`${root}ja/`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByRole('heading', { level: 2, name: 'できること' })).toBeVisible();
  await expect(page.getByText(notice)).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('lang', 'ja');
  // A component of the page writes its words in the language of the page.
  await expect(page.locator('a.brand-logo')).toHaveAttribute(
    'aria-label',
    'ロゴを元のサイズで開く',
  );
  await openNavigation(page);
  const sidebar = page.locator('#starlight__sidebar');
  await expect(sidebar.getByText('ユーザーガイド', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('KOReader と電子書籍リーダー', { exact: true })).toBeVisible();
});

test('a page that is not translated yet shows the English text with a notice', async ({ page }) => {
  await page.goto(`${root}ja/getting-started/installation/`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByText(notice)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Installation' })).toBeVisible();
  // The text is marked as English, which is what a screen reader needs to speak it.
  await expect(page.locator('main')).toHaveAttribute('lang', 'en');
});

test('the components of a page that is not translated yet keep the words of its text', async ({
  page,
}) => {
  await page.goto(`${root}ja/user-guide/advanced-options/cropping/`);
  await expect(page.locator('[data-option-sizes] th').first()).toHaveText('Setting');
  await expect(page.locator('[data-option-example] figure a').first()).toHaveAttribute(
    'title',
    'Open the larger image',
  );
});

test('a reader of the English guide can switch to Japanese and stays on the page', async ({
  page,
}) => {
  await page.goto(`${root}getting-started/installation/`);
  await openNavigation(page, 'Menu');
  await page
    .getByLabel('Select language')
    .filter({ visible: true })
    .selectOption(`${root}ja/getting-started/installation/`);
  await expect(page).toHaveURL(new RegExp(`${root}ja/getting-started/installation/`));
  await expect(page.getByText(notice)).toBeVisible();
  // The way back is on the page, in the language of the page.
  await openNavigation(page);
  await expect(
    page.getByLabel('言語の選択').filter({ visible: true }).locator('option[selected]'),
  ).toHaveText('日本語');
});

test('Japanese search finds the Japanese page and opens it', async ({ page }) => {
  await page.goto(`${root}ja/`);
  await page.getByRole('button', { name: /検索/ }).click();
  await page.getByRole('textbox', { name: '検索', exact: true }).fill('マンガ');
  const results = page.locator('.pagefind-ui__result-link');
  await expect(results.first()).toBeVisible();
  expect(await results.first().getAttribute('href')).toContain(`${root}ja/`);
  await results.first().click();
  await expect(page).toHaveURL(new RegExp(`${root}ja/`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

for (const route of ['', 'getting-started/quickstart/']) {
  for (const colorScheme of ['light', 'dark']) {
    test(`the Japanese site is accessible: ${route || 'home'} ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`${root}ja/${route}`);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
    });
  }
}
