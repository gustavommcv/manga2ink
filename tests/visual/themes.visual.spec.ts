import { expect, test } from '@playwright/test';

// The light theme (ADR 0067) next to the dark one the other pictures are of. The stories take the
// theme from the address (`globals=theme:light`), as they take the language, and are the screens a
// person sees most: the dialog, the queue, a running item, the results, the mapping and the options.

const inLight = (story: string): string =>
  `/iframe.html?id=${story}&viewMode=story&globals=theme:light`;

test.describe('the light theme, at the size the window opens at', () => {
  test.use({ viewport: { height: 760, width: 1180 } });

  test('the dialog of the app settings, with the theme that was kept', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=settings-app-settings-dialog--in-the-light-theme&viewMode=story',
    );
    await expect(page.getByRole('dialog', { name: 'App settings' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light');
    await page.evaluate(async () => document.fonts.ready);
    await expect(page).toHaveScreenshot('light-app-settings-dialog.png');
  });

  test('a queue with items in every state', async ({ page }) => {
    await page.goto(inLight('workflows-queue--with-items'));
    await expect(page.getByRole('heading', { name: 'Queue' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('#storybook-root')).toHaveScreenshot('light-queue-with-items.png');
  });

  test('a running item', async ({ page }) => {
    await page.goto(inLight('workflows-run-and-errors--progress'));
    await expect(page.getByRole('heading', { name: 'Converting A Quiet Journey' })).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('#storybook-root')).toHaveScreenshot('light-running.png');
  });

  test('saved books with the KOReader card', async ({ page }) => {
    await page.goto(inLight('workflows-results--saved-and-sharing'));
    await expect(page.getByRole('heading', { name: '3 books ready' })).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('#storybook-root')).toHaveScreenshot(
      'light-results-saved-sharing.png',
    );
  });

  test('full output settings', async ({ page }) => {
    await page.goto(inLight('workflows-output-settings--normal'));
    await expect(page.getByRole('heading', { name: 'Device & output' })).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('#storybook-root')).toHaveScreenshot('light-output-settings.png');
  });
});

test('the mapping editor in the light theme', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto(inLight('workflows-mapping-editor--provider-suggested'));
  await expect(
    page.getByRole('heading', { name: 'Organize A Quiet Journey into books' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Proposed chapter mapping' })).toBeVisible();
  await page.evaluate(async () => document.fonts.ready);
  await expect(page.locator('#storybook-root')).toHaveScreenshot('light-mapping-editor.png');
});

test('the button state gallery in the light theme', async ({ page }) => {
  await page.goto(inLight('design-system-button--state-gallery'));
  // Not the root alone: it is there before the story is drawn in it (see button.visual.spec.ts).
  await expect(page.locator('#storybook-root').getByRole('button').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(async () => document.fonts.ready);
  await expect(page.locator('#storybook-root')).toHaveScreenshot('light-button-state-gallery.png');
});

// Every pair of text and ground the interface uses, in each theme: the page where a color that
// drifts, or a theme that loses a variable, shows first.
for (const theme of ['dark', 'light'] as const) {
  test(`the palette in the ${theme} theme`, async ({ page }) => {
    await page.goto(
      `/iframe.html?id=design-system-theme--palette&viewMode=story&globals=theme:${theme}`,
    );
    await expect(page.getByRole('region', { name: 'Surface' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('#storybook-root')).toHaveScreenshot(`theme-palette-${theme}.png`);
  });
}
