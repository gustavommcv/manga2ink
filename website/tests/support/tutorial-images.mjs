import { expect } from '@playwright/test';

/** Follow the link as a document; fetching it as an image can hide development-route failures. */
export async function openFullSizeImage(page, name) {
  const link = page.locator(`[data-tutorial-image="${name}"] a`).first();
  const [response] = await Promise.all([
    page.waitForResponse((reply) => reply.request().isNavigationRequest()),
    link.click(),
  ]);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toMatch(/^image\//u);
  const image = page.locator('img');
  await expect(image).toHaveJSProperty('complete', true);
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
  return image;
}

/**
 * The name a capture of the app has on a page of a language (`locale` is the folder of its address,
 * empty for English). The app has English and Portuguese, and a page of the guide shows the picture
 * in its own language; the Japanese pages, with no Japanese app yet, show the English one.
 */
export function captureOn(locale, name) {
  return locale === 'pt-br/' && name.startsWith('generated/')
    ? `generated/pt-br/${name.slice('generated/'.length)}`
    : name;
}
