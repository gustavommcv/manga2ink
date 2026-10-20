import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

import { withoutKnownFalsePositives } from './accessibility-exceptions.mjs';

/**
 * The page has no violation of the WCAG 2.0 and 2.1 levels A and AA that axe finds, but for the one
 * that is not (see accessibility-exceptions.mjs). Every test of the site that scans a page does it
 * this way, so that what is held against a page is one thing.
 */
export async function expectNoAccessibilityViolations(page) {
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(withoutKnownFalsePositives(scan.violations)).toEqual([]);
}
