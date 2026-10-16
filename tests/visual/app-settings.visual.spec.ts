import { expect, test } from '@playwright/test';

// The dialog is drawn over the window, so it is captured at the size the app itself opens at.
test.describe('at the size the window opens at', () => {
  test.use({ viewport: { height: 760, width: 1180 } });

  test('the dialog of the app settings remains visually consistent', async ({ page }) => {
    await page.goto('/iframe.html?id=settings-app-settings-dialog--open&viewMode=story');
    await expect(page.getByRole('dialog', { name: 'App settings' })).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    // The dialog is drawn outside the story's root, so the whole window is what is compared.
    await expect(page).toHaveScreenshot('app-settings-dialog.png');
  });

  test('the About tab of the app settings remains visually consistent', async ({ page }) => {
    await page.goto('/iframe.html?id=settings-app-settings-dialog--about&viewMode=story');
    const dialog = page.getByRole('dialog', { name: 'App settings' });
    await expect(dialog.getByText('Version 0.1.0-alpha.15')).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    // The logo is a picture inside the bundle: it is compared once it has loaded.
    await expect
      .poll(() =>
        page.evaluate(() => [...document.images].every((image) => image.naturalWidth > 0)),
      )
      .toBe(true);
    await expect(page).toHaveScreenshot('app-settings-about.png');
  });

  test('the Updates tab of the app settings remains visually consistent', async ({ page }) => {
    await page.goto('/iframe.html?id=settings-app-settings-dialog--updates&viewMode=story');
    const dialog = page.getByRole('dialog', { name: 'App settings' });
    await expect(dialog.getByRole('status', { name: 'Not available yet' })).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await expect(page).toHaveScreenshot('app-settings-updates.png');
  });
});

// A narrow window gets the dialog's list of tabs as a row above the panel, and a short one gets the
// dialog cut by the window, under the title bar (ADR 0055).
test.describe('in a window that is narrow, and in one that is short', () => {
  test('the dialog of the app settings in the narrowest window remains visually consistent', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 640, width: 480 });
    await page.goto('/iframe.html?id=settings-app-settings-dialog--updates&viewMode=story');
    await expect(
      page
        .getByRole('dialog', { name: 'App settings' })
        .getByRole('status', { name: 'Not available yet' }),
    ).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await expect(page).toHaveScreenshot('app-settings-narrow.png');
  });

  test('the dialog of the app settings in a short window stays under the title bar', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 460, width: 1180 });
    await page.goto('/iframe.html?id=settings-app-settings-dialog--about&viewMode=story');
    const dialog = page.getByRole('dialog', { name: 'App settings' });
    await expect(dialog.getByText('Version 0.1.0-alpha.15')).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await expect
      .poll(() =>
        page.evaluate(() => [...document.images].every((image) => image.naturalWidth > 0)),
      )
      .toBe(true);
    // The title bar is 48px high in the story as in the app: the dialog starts below it.
    const box = await dialog.boundingBox();
    expect(box?.y).toBeGreaterThanOrEqual(48);
    await expect(page).toHaveScreenshot('app-settings-short.png');
  });
});
