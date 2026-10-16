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

  test('the Processing tab of the app settings remains visually consistent', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=settings-app-settings-dialog--processing-in-a-chosen-folder&viewMode=story',
    );
    const dialog = page.getByRole('dialog', { name: 'App settings' });
    await expect(dialog.getByText('/mnt/books/Pending')).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await expect(page).toHaveScreenshot('app-settings-processing.png');
  });
});
