import { expect, test } from '@playwright/test';

test('button state gallery remains visually consistent', async ({ page }) => {
  await page.goto('/iframe.html?id=design-system-button--state-gallery&viewMode=story');
  // The root is there before the story is drawn in it: when many pictures are being checked at once
  // it has been photographed empty (32 by 32 px), so the first button is what is waited for.
  await expect(page.locator('#storybook-root').getByRole('button').first()).toBeVisible();
  await page.evaluate(async () => document.fonts.ready);
  await expect(page.locator('#storybook-root')).toHaveScreenshot('button-state-gallery.png');
});
