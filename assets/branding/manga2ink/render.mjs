// Render editable SVG masters using the project's existing Playwright dependency.
// The document global is used only inside the browser callback below.
/* global document */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const { jobs, executablePath } = JSON.parse(readFileSync(0, 'utf8'));
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
try {
  for (const { source, destination, width, height } of jobs) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    try {
      await page.goto(pathToFileURL(source).href);
      await page.evaluate(
        ({ width, height }) => {
          document.documentElement.setAttribute('width', String(width));
          document.documentElement.setAttribute('height', String(height));
        },
        { width, height },
      );
      await page.screenshot({ path: destination, omitBackground: true });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
